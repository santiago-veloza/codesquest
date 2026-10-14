import pytest
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse

from conftest import CONTRASENA_PRUEBA

pytestmark = pytest.mark.django_db

MODELOS_REGISTRADOS = [modelo._meta for modelo in admin.site._registry]


@pytest.fixture
def cliente_docente(client, contenido_tmp):
    call_command("cargar_contenido", directorio=contenido_tmp)
    docente = get_user_model().objects.create_superuser(
        email="docente@ucc.edu.co", password=CONTRASENA_PRUEBA
    )
    client.force_login(docente)
    return client


@pytest.mark.parametrize("meta", MODELOS_REGISTRADOS, ids=lambda m: m.label)
def test_listado_del_admin_carga(cliente_docente, meta):
    url = reverse(f"admin:{meta.app_label}_{meta.model_name}_changelist")

    assert cliente_docente.get(url).status_code == 200


def test_formulario_de_alta_de_usuario_carga(cliente_docente):
    assert cliente_docente.get(reverse("admin:usuarios_usuario_add")).status_code == 200


def test_edicion_de_mundo_con_sus_desafios_carga(cliente_docente):
    from apps.contenido.models import Mundo

    url = reverse("admin:contenido_mundo_change", args=[Mundo.objects.get(codigo="mundo_1").pk])

    assert cliente_docente.get(url).status_code == 200


def test_estudiante_no_entra_al_admin(client, usuario):
    client.force_login(usuario)

    respuesta = client.get(reverse("admin:index"))

    assert respuesta.status_code == 302  # redirige al login del admin
