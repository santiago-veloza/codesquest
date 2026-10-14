import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_esquema_openapi_se_genera(client):
    respuesta = client.get(reverse("esquema"))

    assert respuesta.status_code == 200
    assert b"/api/v1/salud/" in respuesta.content
