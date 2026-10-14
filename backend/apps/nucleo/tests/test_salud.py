from unittest.mock import patch

import pytest
from django.db import OperationalError
from django.urls import reverse
from rest_framework.test import APIClient

URL_SALUD = reverse("salud")


@pytest.fixture
def cliente():
    return APIClient()


@pytest.mark.django_db
def test_salud_responde_ok_sin_autenticacion(cliente):
    respuesta = cliente.get(URL_SALUD)

    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok", "base_de_datos": "ok"}


@pytest.mark.django_db
def test_salud_responde_503_si_la_base_de_datos_falla(cliente):
    with patch("apps.nucleo.views.connection.cursor", side_effect=OperationalError("caída")):
        respuesta = cliente.get(URL_SALUD)

    assert respuesta.status_code == 503
    assert respuesta.json()["base_de_datos"] == "error"
    assert "caída" not in respuesta.content.decode()  # no se filtra el detalle técnico


@pytest.mark.django_db
def test_salud_no_acepta_post(cliente):
    respuesta = cliente.post(URL_SALUD)

    assert respuesta.status_code == 405
    assert respuesta.json()["error"]["codigo"] == "metodo_no_permitido"
