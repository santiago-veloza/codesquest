"""Reglas de gamificación: XP, nivel, puntos y logros. El servidor es la ÚNICA fuente de verdad
(el navegador solo muestra lo que estas funciones deciden)."""

from dataclasses import dataclass, field

from apps.contenido.models import Desafio, Mundo
from apps.progreso.models import IntentoDesafio, ResultadoIntento
from apps.usuarios.models import Perfil
from config import juego

from .models import CriterioLogro, Logro, UsuarioLogro

# --- Fórmulas puras (fáciles de probar) ---


def xp_por_desafio(xp_base: int, pistas_usadas: int, primer_intento: bool) -> int:
    minimo = int(xp_base * juego.FRACCION_MINIMA_XP)
    con_pistas = max(xp_base - juego.PENALIZACION_POR_PISTA * pistas_usadas, minimo)
    return con_pistas + (juego.BONUS_PRIMER_INTENTO if primer_intento else 0)


def umbral_de_nivel(nivel: int) -> int:
    """XP necesaria para alcanzar `nivel` (nivel 1 = 0 XP)."""
    return juego.FACTOR_NIVEL * nivel * (nivel - 1)


def nivel_para(experiencia: int) -> int:
    nivel = juego.NIVEL_INICIAL
    while umbral_de_nivel(nivel + 1) <= experiencia:
        nivel += 1
    return nivel


# --- Resultado que se devuelve al navegador ---


@dataclass
class Recompensa:
    xp_otorgada: int = 0
    puntos_otorgados: int = 0
    experiencia: int = 0
    puntos: int = 0
    nivel: int = juego.NIVEL_INICIAL
    subio_de_nivel: bool = False
    logros_nuevos: list[Logro] = field(default_factory=list)
    # Para que el navegador redibuje la barra de XP sin repetir la fórmula de nivel.
    experiencia_nivel_actual: int = 0
    experiencia_siguiente_nivel: int = 0


def _perfil(usuario) -> Perfil:
    apodo = usuario.email.split("@")[0][: juego.LARGO_MAXIMO_APODO]
    perfil, _ = Perfil.objects.select_for_update().get_or_create(usuario=usuario, defaults={"apodo": apodo})
    return perfil


def _aplicar(usuario, xp: int, puntos_extra: int, logros_nuevos: list[Logro]) -> Recompensa:
    perfil = _perfil(usuario)
    nivel_anterior = perfil.nivel
    perfil.experiencia += xp
    perfil.puntos += xp + puntos_extra
    perfil.nivel = nivel_para(perfil.experiencia)
    perfil.save(update_fields=["experiencia", "puntos", "nivel"])
    return Recompensa(
        xp_otorgada=xp,
        puntos_otorgados=xp + puntos_extra,
        experiencia=perfil.experiencia,
        puntos=perfil.puntos,
        nivel=perfil.nivel,
        subio_de_nivel=perfil.nivel > nivel_anterior,
        logros_nuevos=logros_nuevos,
        experiencia_nivel_actual=umbral_de_nivel(perfil.nivel),
        experiencia_siguiente_nivel=umbral_de_nivel(perfil.nivel + 1),
    )


def _otorgar(usuario, logros) -> list[Logro]:
    nuevos = []
    for logro in logros:
        _, creado = UsuarioLogro.objects.get_or_create(usuario=usuario, logro=logro)
        if creado:
            nuevos.append(logro)
    return nuevos


# --- Eventos del juego ---


def xp_para_intento_correcto(usuario, desafio: Desafio, pistas_usadas: int, intento_actual_id: int) -> int:
    """XP del intento correcto recién guardado; 0 si el desafío ya estaba resuelto antes."""
    previos = IntentoDesafio.objects.filter(usuario=usuario, desafio=desafio).exclude(id=intento_actual_id)
    if previos.filter(resultado=ResultadoIntento.CORRECTO).exists():
        return 0
    return xp_por_desafio(desafio.xp_base, pistas_usadas, primer_intento=not previos.exists())


def al_resolver_desafio(usuario, xp: int) -> Recompensa:
    """Se llama dentro de la transacción del intento correcto."""
    logros = Logro.objects.filter(criterio=CriterioLogro.PRIMER_DESAFIO) if xp else Logro.objects.none()
    return _aplicar(usuario, xp, 0, _otorgar(usuario, logros))


def al_completar_mundo(usuario, mundo: Mundo, ya_estaba_completado: bool) -> Recompensa:
    if ya_estaba_completado:
        return _aplicar(usuario, 0, 0, [])
    candidatos = list(Logro.objects.filter(criterio=CriterioLogro.COMPLETAR_MUNDO, mundo=mundo))
    sin_pistas = not IntentoDesafio.objects.filter(
        usuario=usuario, desafio__mundo=mundo, pistas_usadas__gt=0
    ).exists()
    if sin_pistas:
        candidatos += list(Logro.objects.filter(criterio=CriterioLogro.MUNDO_SIN_PISTAS))
    return _aplicar(usuario, 0, juego.BONUS_PUNTOS_MUNDO, _otorgar(usuario, candidatos))
