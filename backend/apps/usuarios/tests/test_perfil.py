import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from apps.usuarios.models import Perfil

URL = reverse("perfil")
pytestmark = pytest.mark.django_db


@pytest.fixture
def api_autenticada(api, usuario):
    Perfil.objects.create(usuario=usuario, apodo="Ada")
    api.force_authenticate(usuario)
    return api


def test_perfil_exige_sesion(api):
    respuesta = api.get(URL)

    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "no_autenticado"


def test_perfil_con_access_token_real(api, usuario):
    access = api.post(
        reverse("login"), {"email": usuario.email, "password": "UnaClaveSegura-2026"}, format="json"
    ).json()["access"]

    respuesta = api.get(URL, HTTP_AUTHORIZATION=f"Bearer {access}")

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == usuario.email


def test_token_alterado_se_rechaza(api, usuario):
    respuesta = api.get(URL, HTTP_AUTHORIZATION="Bearer eyJhbGciOiJIUzI1NiJ9.e30.firma-falsa")

    assert respuesta.status_code == 401


def test_get_devuelve_datos_de_juego(api_autenticada):
    datos = api_autenticada.get(URL).json()

    assert datos["apodo"] == "Ada"
    assert {"experiencia", "puntos", "nivel", "energia", "avatar", "rol", "fecha_registro"} <= set(datos)


def test_patch_cambia_apodo_y_avatar(api_autenticada):
    respuesta = api_autenticada.patch(URL, {"apodo": "Ada L.", "avatar": "chispa"}, format="json")

    assert respuesta.status_code == 200
    assert respuesta.json()["apodo"] == "Ada L." and respuesta.json()["avatar"] == "chispa"


def test_patch_no_permite_cambiar_valores_de_juego_ni_correo(api_autenticada, usuario):
    api_autenticada.patch(
        URL, {"experiencia": 5000, "nivel": 9, "energia": 0, "email": "otro@campusucc.edu.co"}, format="json"
    )

    perfil = Perfil.objects.get(usuario=usuario)
    usuario.refresh_from_db()
    assert (perfil.experiencia, perfil.nivel, perfil.energia) == (0, 1, 100)
    assert usuario.email == "estudiante@campusucc.edu.co"


def test_patch_con_avatar_invalido_falla(api_autenticada):
    assert api_autenticada.patch(URL, {"avatar": "dragon"}, format="json").status_code == 400


def test_put_no_esta_permitido(api_autenticada):
    assert api_autenticada.put(URL, {"apodo": "X"}, format="json").status_code == 405


def test_cada_usuario_solo_ve_su_propio_perfil(api_autenticada):
    otro = get_user_model().objects.create_user(email="otro@campusucc.edu.co", password="Clave-Segura-999")
    Perfil.objects.create(usuario=otro, apodo="Otro")

    assert api_autenticada.get(URL).json()["apodo"] == "Ada"


def test_cuenta_sin_perfil_recibe_uno_al_consultar(api):
    admin = get_user_model().objects.create_superuser(email="docente@ucc.edu.co", password="Clave-Segura-999")
    api.force_authenticate(admin)

    respuesta = api.get(URL)

    assert respuesta.status_code == 200
    assert respuesta.json()["apodo"] == "docente"
    assert respuesta.json()["rol"] == "docente_admin"
