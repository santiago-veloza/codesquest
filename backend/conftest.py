"""Fixtures compartidas por todas las pruebas del backend."""

import shutil

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

CONTRASENA_PRUEBA = "UnaClaveSegura-2026"
# Cabecera anti-CSRF que exige el backend en refresh/logout (formato de Django test client).
CABECERA_CLIENTE = {"HTTP_X_CODEQUEST_CLIENTE": "web"}


@pytest.fixture(autouse=True)
def _limpiar_cache():
    """El throttling guarda contadores en caché: cada prueba empieza de cero."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def usuario(db):
    return get_user_model().objects.create_user(
        email="estudiante@campusucc.edu.co", password=CONTRASENA_PRUEBA
    )


@pytest.fixture
def contenido_tmp(tmp_path):
    """Copia de content/ que cada prueba puede modificar sin tocar el contenido real."""
    destino = tmp_path / "content"
    shutil.copytree(settings.CONTENIDO_DIR, destino)
    return destino
