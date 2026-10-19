"""Estadísticas del docente en el admin (RF-11): cálculos, acceso y exportación CSV."""

import csv
import io

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse

from apps.contenido.models import Desafio, Mundo
from apps.progreso import estadisticas
from apps.progreso.models import EstadoMundo, IntentoDesafio, ProgresoMundo, ResultadoIntento
from apps.usuarios.models import Perfil, Rol
from config import juego

pytestmark = pytest.mark.django_db
Usuario = get_user_model()


@pytest.fixture
def curso(contenido_tmp):
    """Ana resolvió el 1.1 al segundo intento (con 1 pista) y completó el Mundo 1; Beto falló el 1.1
    dos veces con NameError. Un docente con intentos que NO deben contar."""
    call_command("cargar_contenido", directorio=contenido_tmp)
    d11 = Desafio.objects.get(codigo="1.1")
    mundo1 = Mundo.objects.get(orden=1)
    ana = Usuario.objects.create_user(email="ana@campusucc.edu.co", password="x")
    beto = Usuario.objects.create_user(email="beto@campusucc.edu.co", password="x")
    docente = Usuario.objects.create_user(email="profe@campusucc.edu.co", password="x", rol=Rol.DOCENTE_ADMIN)
    Perfil.objects.create(usuario=ana, apodo="Ana", experiencia=40, puntos=65, nivel=2)
    Perfil.objects.create(usuario=beto, apodo="=HIPERVINCULO()", experiencia=0, puntos=0)

    def intento(usuario, resultado, tipo_error="", pistas=0, tiempo_ms=10_000):
        IntentoDesafio.objects.create(
            usuario=usuario,
            desafio=d11,
            codigo_enviado="x",
            resultado=resultado,
            tipo_error=tipo_error,
            pistas_usadas=pistas,
            tiempo_ms=tiempo_ms,
        )

    intento(ana, ResultadoIntento.INCORRECTO, "valor_incorrecto")
    intento(ana, ResultadoIntento.CORRECTO, pistas=1, tiempo_ms=20_000)
    intento(beto, ResultadoIntento.ERROR, "NameError")
    intento(beto, ResultadoIntento.ERROR, "NameError")
    intento(docente, ResultadoIntento.CORRECTO)
    ProgresoMundo.objects.create(usuario=ana, mundo=mundo1, estado=EstadoMundo.COMPLETADO, porcentaje=100)
    ProgresoMundo.objects.create(usuario=beto, mundo=mundo1, estado=EstadoMundo.DESBLOQUEADO, porcentaje=0)
    return {"ana": ana, "beto": beto, "docente": docente}


def test_el_resumen_cuenta_solo_estudiantes(curso):
    r = estadisticas.resumen()

    assert (r.estudiantes, r.intentos, r.desafios_resueltos, r.mundos_completados) == (2, 4, 1, 1)
    assert r.tasa_acierto == 25  # 1 correcto de 4 (el intento del docente no cuenta)
    assert r.activos_recientes == 2
    assert r.xp_promedio == 20


def test_por_desafio_muestra_dificultad_y_error_mas_comun(curso):
    fila = next(d for d in estadisticas.por_desafio() if d.codigo == "1.1")

    assert (fila.intentos, fila.estudiantes, fila.resolvieron) == (4, 2, 1)
    assert fila.tasa_exito == 25
    assert fila.dificil is (25 < juego.UMBRAL_DESAFIO_DIFICIL)
    assert fila.error_frecuente == "NameError"
    assert fila.intentos_por_estudiante == 2.0
    assert fila.pistas_promedio == 0.2  # 1 pista en 4 intentos
    assert fila.tiempo_promedio_s == 12  # (10 + 20 + 10 + 10) / 4


def test_un_desafio_sin_intentos_no_se_marca_como_dificil(curso):
    fila = next(d for d in estadisticas.por_desafio() if d.codigo == "1.2")

    assert (fila.intentos, fila.tasa_exito, fila.dificil, fila.error_frecuente) == (0, 0, False, "")


def test_por_mundo_el_primero_esta_abierto_para_todos(curso):
    mundos = {m.orden: m for m in estadisticas.por_mundo()}

    assert (mundos[1].llegaron, mundos[1].completaron, mundos[1].porcentaje_completaron) == (2, 1, 50)
    assert mundos[2].llegaron == 0


def test_por_estudiante_ordena_por_experiencia_y_excluye_docentes(curso):
    filas = estadisticas.por_estudiante()

    assert [f.email for f in filas] == ["ana@campusucc.edu.co", "beto@campusucc.edu.co"]
    ana = filas[0]
    assert (ana.nivel, ana.experiencia, ana.mundos_completados, ana.desafios_resueltos, ana.intentos) == (
        2,
        40,
        1,
        1,
        2,
    )
    assert ana.ultima_actividad is not None


@pytest.fixture
def cliente_docente(client, db):
    docente = Usuario.objects.create_superuser(email="docente@campusucc.edu.co", password="x")
    client.force_login(docente)
    return client


def test_el_docente_ve_las_estadisticas_y_el_enlace_en_la_portada(cliente_docente, curso):
    portada = cliente_docente.get(reverse("admin:index")).content.decode()
    pagina = cliente_docente.get(reverse("admin-estadisticas"))

    assert reverse("admin-estadisticas") in portada
    assert pagina.status_code == 200
    html = pagina.content.decode()
    for texto in (
        "Avance por mundo",
        "Desafíos: ¿qué les cuesta más?",
        "Estudiantes",
        "ana@campusucc.edu.co",
        "NameError",
    ):
        assert texto in html
    assert "profe@campusucc.edu.co" not in html


@pytest.mark.parametrize("ruta", ["admin-estadisticas", "admin-estadisticas-csv"])
def test_sin_sesion_de_staff_no_se_puede_entrar(client, curso, ruta):
    anonimo = client.get(reverse(ruta))
    client.force_login(curso["ana"])  # estudiante con sesión, pero sin acceso al admin
    estudiante = client.get(reverse(ruta))

    for respuesta in (anonimo, estudiante):
        assert respuesta.status_code == 302
        assert reverse("admin:login") in respuesta["Location"]


def test_el_csv_abre_en_excel_y_neutraliza_formulas(cliente_docente, curso):
    respuesta = cliente_docente.get(reverse("admin-estadisticas-csv"))

    assert respuesta["Content-Type"].startswith("text/csv")
    assert "attachment" in respuesta["Content-Disposition"]
    contenido = respuesta.content.decode("utf-8")
    assert contenido.startswith("﻿")  # BOM: Excel lee bien las tildes
    filas = list(csv.reader(io.StringIO(contenido.lstrip("﻿")), delimiter=";"))
    assert filas[0][:2] == ["Apodo", "Correo"] and filas[0][6] == "Desafíos resueltos"
    assert filas[1][:3] == ["Ana", "ana@campusucc.edu.co", "2"]
    assert filas[2][0] == "'=HIPERVINCULO()"  # OWASP: Excel no lo ejecuta como fórmula
    assert len(filas) == 3  # el docente no aparece
