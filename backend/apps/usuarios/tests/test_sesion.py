"""Refresh con rotación, logout y protección anti-CSRF de las vistas que usan la cookie."""

import pytest
from django.conf import settings
from django.urls import reverse

from conftest import CABECERA_CLIENTE, CONTRASENA_PRUEBA

URL_REFRESH = reverse("refresh")
URL_LOGOUT = reverse("logout")
NOMBRE_COOKIE = settings.COOKIE_REFRESH["nombre"]
pytestmark = pytest.mark.django_db


@pytest.fixture
def api_con_sesion(api, usuario):
    api.post(reverse("login"), {"email": usuario.email, "password": CONTRASENA_PRUEBA}, format="json")
    return api


def _refresh(api):
    return api.post(URL_REFRESH, **CABECERA_CLIENTE)


def test_refresh_entrega_nuevo_access_y_rota_la_cookie(api_con_sesion):
    anterior = api_con_sesion.cookies[NOMBRE_COOKIE].value

    respuesta = _refresh(api_con_sesion)

    assert respuesta.status_code == 200
    assert respuesta.json()["access"]
    assert respuesta.cookies[NOMBRE_COOKIE].value != anterior


def test_refresh_anterior_no_se_puede_reutilizar(api_con_sesion):
    robado = api_con_sesion.cookies[NOMBRE_COOKIE].value
    _refresh(api_con_sesion)  # rota: el anterior queda en la lista negra

    api_con_sesion.cookies[NOMBRE_COOKIE] = robado
    respuesta = _refresh(api_con_sesion)

    assert respuesta.status_code == 401
    assert respuesta.json()["error"]["codigo"] == "sesion_invalida"


def test_refresh_sin_cookie_responde_401(api):
    assert _refresh(api).status_code == 401


def test_refresh_con_token_falso_responde_401(api):
    api.cookies[NOMBRE_COOKIE] = "esto.no.es-un-jwt"

    assert _refresh(api).status_code == 401


def test_refresh_sin_cabecera_del_cliente_se_rechaza_csrf(api_con_sesion):
    respuesta = api_con_sesion.post(URL_REFRESH)

    assert respuesta.status_code == 403
    assert respuesta.json()["error"]["codigo"] == "sin_permiso"


def test_refresh_de_usuario_borrado_responde_401_y_no_500(api_con_sesion, usuario):
    usuario.delete()

    assert _refresh(api_con_sesion).status_code == 401


def test_refresh_de_usuario_desactivado_responde_401(api_con_sesion, usuario):
    usuario.is_active = False
    usuario.save()

    assert _refresh(api_con_sesion).status_code == 401


def test_logout_invalida_el_refresh_y_borra_la_cookie(api_con_sesion):
    token = api_con_sesion.cookies[NOMBRE_COOKIE].value

    respuesta = api_con_sesion.post(URL_LOGOUT, **CABECERA_CLIENTE)

    assert respuesta.status_code == 204
    assert respuesta.cookies[NOMBRE_COOKIE].value == ""
    api_con_sesion.cookies[NOMBRE_COOKIE] = token
    assert _refresh(api_con_sesion).status_code == 401


def test_logout_sin_sesion_no_falla(api):
    assert api.post(URL_LOGOUT, **CABECERA_CLIENTE).status_code == 204


def test_logout_sin_cabecera_del_cliente_se_rechaza(api_con_sesion):
    assert api_con_sesion.post(URL_LOGOUT).status_code == 403
