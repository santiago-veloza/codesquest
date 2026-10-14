import pytest
from django.conf import settings
from django.urls import reverse

from apps.usuarios.models import Perfil, Rol, Usuario

URL = reverse("registro")
pytestmark = pytest.mark.django_db


def _datos(**cambios):
    return {
        "email": "Ada@CampusUcc.edu.co",
        "password": "Lovelace-1815-Maquina",
        "apodo": "Ada",
        "avatar": "pixel",
        "acepta_privacidad": True,
    } | cambios


def test_registro_crea_cuenta_perfil_y_sesion(api):
    respuesta = api.post(URL, _datos(), format="json")

    assert respuesta.status_code == 201
    cuerpo = respuesta.json()
    assert cuerpo["access"]
    assert cuerpo["perfil"]["email"] == "ada@campusucc.edu.co"
    assert cuerpo["perfil"]["apodo"] == "Ada" and cuerpo["perfil"]["avatar"] == "pixel"
    assert cuerpo["perfil"]["nivel"] == 1 and cuerpo["perfil"]["experiencia"] == 0
    assert Perfil.objects.filter(usuario__email="ada@campusucc.edu.co").exists()


def test_registro_guarda_evidencia_del_consentimiento(api):
    api.post(URL, _datos(), format="json")

    usuario = Usuario.objects.get(email="ada@campusucc.edu.co")
    assert usuario.fecha_aceptacion_privacidad is not None
    assert usuario.version_aviso_privacidad == settings.VERSION_AVISO_PRIVACIDAD


def test_refresh_viaja_en_cookie_httponly_strict_y_no_en_el_cuerpo(api):
    respuesta = api.post(URL, _datos(), format="json")

    cookie = respuesta.cookies[settings.COOKIE_REFRESH["nombre"]]
    assert cookie["httponly"]
    assert cookie["samesite"] == "Strict"
    assert cookie["path"] == "/api/v1/auth/"
    assert "refresh" not in respuesta.json()


@pytest.mark.parametrize("consentimiento", [False, None])
def test_registro_sin_consentimiento_falla(api, consentimiento):
    datos = _datos(acepta_privacidad=consentimiento)
    if consentimiento is None:
        datos.pop("acepta_privacidad")

    respuesta = api.post(URL, datos, format="json")

    assert respuesta.status_code == 400
    assert "acepta_privacidad" in respuesta.json()["error"]["detalles"]
    assert not Usuario.objects.exists()


@pytest.mark.parametrize(
    "password",
    ["12345678", "corta1", "ada@campusucc.edu.co1", "password"],
    ids=["numerica", "corta", "parecida_al_correo", "comun"],
)
def test_contrasenas_debiles_se_rechazan(api, password):
    respuesta = api.post(URL, _datos(password=password), format="json")

    assert respuesta.status_code == 400
    assert "password" in respuesta.json()["error"]["detalles"]


def test_correo_repetido_con_otras_mayusculas_se_rechaza(api, usuario):
    respuesta = api.post(URL, _datos(email=usuario.email.upper()), format="json")

    assert respuesta.status_code == 400
    assert "email" in respuesta.json()["error"]["detalles"]


def test_cliente_no_puede_asignarse_rol_ni_xp(api):
    respuesta = api.post(URL, _datos(rol="docente_admin", experiencia=9999, nivel=50), format="json")

    assert respuesta.status_code == 201
    usuario = Usuario.objects.get(email="ada@campusucc.edu.co")
    assert usuario.rol == Rol.ESTUDIANTE and not usuario.is_staff
    assert usuario.perfil.experiencia == 0 and usuario.perfil.nivel == 1


@pytest.mark.parametrize("apodo", ["A", "<script>alert(1)</script>", "x" * 31])
def test_apodo_invalido_se_rechaza(api, apodo):
    respuesta = api.post(URL, _datos(apodo=apodo), format="json")

    assert respuesta.status_code == 400
    assert "apodo" in respuesta.json()["error"]["detalles"]


def test_avatar_inexistente_se_rechaza(api):
    assert api.post(URL, _datos(avatar="dragon"), format="json").status_code == 400


def test_contrasena_no_aparece_en_la_respuesta(api):
    respuesta = api.post(URL, _datos(), format="json")

    assert "Lovelace-1815-Maquina" not in respuesta.content.decode()


def test_registro_tiene_limite_por_ip(api):
    estados = [
        api.post(URL, _datos(email=f"u{i}@campusucc.edu.co", apodo=f"Usuario{i}"), format="json").status_code
        for i in range(6)
    ]

    assert estados[:5] == [201] * 5
    assert estados[5] == 429


@pytest.mark.parametrize(
    "correo",
    [
        "ada@gmail.com",
        "ada@ucc.edu.co",
        "ada@campusucc.edu.co.sitio-falso.com",
        "ada@falso-campusucc.edu.co",
    ],
    ids=["gmail", "otro_dominio_ucc", "dominio_al_final", "dominio_parecido"],
)
def test_solo_se_permiten_correos_institucionales(api, correo):
    respuesta = api.post(URL, _datos(email=correo), format="json")

    assert respuesta.status_code == 400
    assert respuesta.json()["error"]["detalles"]["email"] == [
        "Usa tu correo institucional (@campusucc.edu.co)."
    ]
    assert not Usuario.objects.exists()


def test_el_dominio_institucional_no_distingue_mayusculas(api):
    assert api.post(URL, _datos(email="Ada@CAMPUSUCC.EDU.CO"), format="json").status_code == 201
