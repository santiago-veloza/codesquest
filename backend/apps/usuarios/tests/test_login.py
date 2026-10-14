import pytest
from django.urls import reverse

from conftest import CONTRASENA_PRUEBA

URL = reverse("login")
pytestmark = pytest.mark.django_db


def _login(api, email, password=CONTRASENA_PRUEBA, ip="10.0.0.1"):
    return api.post(URL, {"email": email, "password": password}, format="json", REMOTE_ADDR=ip)


def test_login_correcto_entrega_access_y_cookie(api, usuario):
    respuesta = _login(api, usuario.email)

    assert respuesta.status_code == 200
    assert respuesta.json()["access"]
    assert respuesta.json()["perfil"]["email"] == usuario.email
    assert "cq_refresh" in respuesta.cookies


def test_login_ignora_mayusculas_y_espacios_del_correo(api, usuario):
    assert _login(api, "  ESTUDIANTE@CampusUcc.edu.co ").status_code == 200


def test_login_registra_ultimo_acceso(api, usuario):
    _login(api, usuario.email)
    usuario.refresh_from_db()

    assert usuario.last_login is not None


def test_mensajes_iguales_si_el_correo_no_existe_o_la_clave_es_incorrecta(api, usuario):
    clave_errada = _login(api, usuario.email, password="otra-clave-123")
    correo_inexistente = _login(api, "nadie@campusucc.edu.co")

    assert clave_errada.status_code == correo_inexistente.status_code == 401
    assert clave_errada.json() == correo_inexistente.json()
    assert clave_errada.json()["error"]["codigo"] == "credenciales_invalidas"


def test_cuenta_inactiva_recibe_el_mismo_mensaje_generico(api, usuario):
    usuario.is_active = False
    usuario.save()

    respuesta = _login(api, usuario.email)

    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "credenciales_invalidas"


def test_login_sin_campos_responde_400(api):
    respuesta = api.post(URL, {}, format="json")

    assert respuesta.status_code == 400
    assert set(respuesta.json()["error"]["detalles"]) == {"email", "password"}


def test_fuerza_bruta_contra_una_cuenta_se_bloquea_aunque_cambie_la_ip(api, usuario):
    estados = [_login(api, usuario.email, "mala", ip=f"10.0.0.{i}").status_code for i in range(6)]

    assert estados[:5] == [401] * 5
    assert estados[5] == 429


def test_fuerza_bruta_desde_una_ip_se_bloquea_aunque_cambie_el_correo(api):
    estados = [
        _login(api, f"victima{i}@campusucc.edu.co", "mala", ip="10.9.9.9").status_code for i in range(11)
    ]

    assert estados[:10] == [401] * 10
    assert estados[10] == 429


def test_respuesta_429_tiene_formato_uniforme(api, usuario):
    for _ in range(5):
        _login(api, usuario.email, "mala")

    respuesta = _login(api, usuario.email, "mala")

    assert respuesta.json()["error"]["codigo"] == "demasiadas_solicitudes"


def test_estudiante_con_correo_no_institucional_no_puede_ingresar(api, db):
    from django.contrib.auth import get_user_model

    get_user_model().objects.create_user(email="antiguo@gmail.com", password=CONTRASENA_PRUEBA)

    respuesta = _login(api, "antiguo@gmail.com")

    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "credenciales_invalidas"


def test_docente_con_otro_dominio_si_puede_ingresar(api, db):
    from django.contrib.auth import get_user_model

    get_user_model().objects.create_superuser(email="docente@ucc.edu.co", password=CONTRASENA_PRUEBA)

    assert _login(api, "docente@ucc.edu.co").status_code == 200
