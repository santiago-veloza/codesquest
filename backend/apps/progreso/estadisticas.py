"""Estadísticas del curso para el docente (RF-11). Solo lecturas: nada aquí modifica datos.

Solo cuentan las cuentas de estudiante: las de docente/administrador no alteran los promedios.
Las consultas agregan en la base de datos (una por bloque) para que sigan siendo rápidas con un curso
completo.
"""

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import timedelta

from django.db.models import Avg, Count, Max, Q
from django.utils import timezone

from apps.contenido.models import Desafio, Mundo
from apps.usuarios.models import Perfil, Rol, Usuario
from config import juego

from .models import EstadoMundo, IntentoDesafio, ProgresoMundo, ResultadoIntento

ORDEN_PRIMER_MUNDO = 1
MS_POR_SEGUNDO = 1000
CORRECTO = Q(resultado=ResultadoIntento.CORRECTO)


def _estudiantes():
    return Usuario.objects.filter(rol=Rol.ESTUDIANTE)


def _intentos():
    return IntentoDesafio.objects.filter(usuario__rol=Rol.ESTUDIANTE)


def _porcentaje(parte: int, total: int) -> int:
    return round(juego.PORCENTAJE_MAXIMO * parte / total) if total else 0


@dataclass(frozen=True)
class Resumen:
    estudiantes: int
    activos_recientes: int
    dias_actividad: int
    intentos: int
    tasa_acierto: int
    desafios_resueltos: int
    nivel_promedio: float
    xp_promedio: int
    mundos_completados: int


def resumen() -> Resumen:
    desde = timezone.now() - timedelta(days=juego.DIAS_ACTIVIDAD_RECIENTE)
    intentos = _intentos().aggregate(total=Count("id"), correctos=Count("id", filter=CORRECTO))
    perfiles = Perfil.objects.filter(usuario__rol=Rol.ESTUDIANTE).aggregate(
        nivel=Avg("nivel"), xp=Avg("experiencia")
    )
    resueltos = _intentos().filter(CORRECTO).values("usuario", "desafio").distinct().count()
    return Resumen(
        estudiantes=_estudiantes().count(),
        activos_recientes=_intentos().filter(fecha__gte=desde).values("usuario").distinct().count(),
        dias_actividad=juego.DIAS_ACTIVIDAD_RECIENTE,
        intentos=intentos["total"],
        tasa_acierto=_porcentaje(intentos["correctos"], intentos["total"]),
        desafios_resueltos=resueltos,
        nivel_promedio=round(perfiles["nivel"] or juego.NIVEL_INICIAL, 1),
        xp_promedio=round(perfiles["xp"] or 0),
        mundos_completados=ProgresoMundo.objects.filter(
            usuario__rol=Rol.ESTUDIANTE, estado=EstadoMundo.COMPLETADO
        ).count(),
    )


@dataclass(frozen=True)
class FilaMundo:
    orden: int
    nombre: str
    llegaron: int  # estudiantes con el mundo desbloqueado o completado
    completaron: int
    porcentaje_completaron: int
    avance_promedio: int  # % promedio de obstáculos resueltos entre quienes llegaron


def por_mundo() -> list[FilaMundo]:
    total = _estudiantes().count()
    progresos = {
        fila["mundo"]: fila
        for fila in ProgresoMundo.objects.filter(usuario__rol=Rol.ESTUDIANTE)
        .values("mundo")
        .annotate(
            llegaron=Count("id", filter=~Q(estado=EstadoMundo.BLOQUEADO)),
            completaron=Count("id", filter=Q(estado=EstadoMundo.COMPLETADO)),
            avance=Avg("porcentaje", filter=~Q(estado=EstadoMundo.BLOQUEADO)),
        )
    }
    filas = []
    for mundo in Mundo.objects.filter(activo=True).order_by("orden"):
        datos = progresos.get(mundo.id, {})
        # El primer mundo está abierto para todos aunque aún no tengan fila de progreso.
        llegaron = total if mundo.orden == ORDEN_PRIMER_MUNDO else datos.get("llegaron", 0)
        completaron = datos.get("completaron", 0)
        filas.append(
            FilaMundo(
                orden=mundo.orden,
                nombre=mundo.nombre,
                llegaron=llegaron,
                completaron=completaron,
                porcentaje_completaron=_porcentaje(completaron, llegaron),
                avance_promedio=round(datos.get("avance") or 0),
            )
        )
    return filas


@dataclass(frozen=True)
class FilaDesafio:
    codigo: str
    titulo: str
    mundo: int
    intentos: int
    estudiantes: int
    resolvieron: int
    tasa_exito: int  # % de intentos correctos
    intentos_por_estudiante: float
    pistas_promedio: float
    tiempo_promedio_s: int
    error_frecuente: str  # tipo de error más común en los intentos fallidos ("" si no hay)
    dificil: bool  # con intentos y menos de UMBRAL_DESAFIO_DIFICIL % correctos: reforzar en clase


def por_desafio() -> list[FilaDesafio]:
    datos = {
        fila["desafio"]: fila
        for fila in _intentos()
        .values("desafio")
        .annotate(
            intentos=Count("id"),
            correctos=Count("id", filter=CORRECTO),
            estudiantes=Count("usuario", distinct=True),
            resolvieron=Count("usuario", filter=CORRECTO, distinct=True),
            pistas=Avg("pistas_usadas"),
            tiempo=Avg("tiempo_ms"),
        )
    }
    errores: dict[int, Counter] = defaultdict(Counter)
    for fila in (
        _intentos()
        .exclude(CORRECTO)
        .exclude(tipo_error="")
        .values("desafio", "tipo_error")
        .annotate(n=Count("id"))
    ):
        errores[fila["desafio"]][fila["tipo_error"]] = fila["n"]

    filas = []
    for desafio in (
        Desafio.objects.filter(mundo__activo=True).select_related("mundo").order_by("mundo__orden", "orden")
    ):
        d = datos.get(desafio.id, {})
        intentos, estudiantes = d.get("intentos", 0), d.get("estudiantes", 0)
        tasa = _porcentaje(d.get("correctos", 0), intentos)
        frecuente = errores[desafio.id].most_common(1)
        filas.append(
            FilaDesafio(
                codigo=desafio.codigo,
                titulo=desafio.titulo,
                mundo=desafio.mundo.orden,
                intentos=intentos,
                estudiantes=estudiantes,
                resolvieron=d.get("resolvieron", 0),
                tasa_exito=tasa,
                intentos_por_estudiante=round(intentos / estudiantes, 1) if estudiantes else 0,
                pistas_promedio=round(d.get("pistas") or 0, 1),
                tiempo_promedio_s=round((d.get("tiempo") or 0) / MS_POR_SEGUNDO),
                error_frecuente=frecuente[0][0] if frecuente else "",
                dificil=bool(intentos) and tasa < juego.UMBRAL_DESAFIO_DIFICIL,
            )
        )
    return filas


@dataclass(frozen=True)
class FilaEstudiante:
    id: int
    apodo: str
    email: str
    nivel: int
    experiencia: int
    puntos: int
    mundos_completados: int
    desafios_resueltos: int
    intentos: int
    ultima_actividad: object  # datetime o None


def por_estudiante() -> list[FilaEstudiante]:
    usuarios = (
        _estudiantes()
        .select_related("perfil")
        .annotate(
            intentos_total=Count("intentos", distinct=True),
            resueltos=Count(
                "intentos__desafio", filter=Q(intentos__resultado=ResultadoIntento.CORRECTO), distinct=True
            ),
            completados=Count("progresos", filter=Q(progresos__estado=EstadoMundo.COMPLETADO), distinct=True),
            ultimo_intento=Max("intentos__fecha"),
        )
        .order_by("-perfil__experiencia", "email")
    )
    filas = []
    for u in usuarios:
        perfil = getattr(u, "perfil", None)
        filas.append(
            FilaEstudiante(
                id=u.id,
                apodo=perfil.apodo if perfil else "",
                email=u.email,
                nivel=perfil.nivel if perfil else juego.NIVEL_INICIAL,
                experiencia=perfil.experiencia if perfil else 0,
                puntos=perfil.puntos if perfil else 0,
                mundos_completados=u.completados,
                desafios_resueltos=u.resueltos,
                intentos=u.intentos_total,
                ultima_actividad=u.ultimo_intento or u.last_login,
            )
        )
    return filas
