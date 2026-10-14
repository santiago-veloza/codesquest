import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.usuarios.models import Rol

Usuario = get_user_model()
CONTRASENA = "UnaClaveSegura-2026"

pytestmark = pytest.mark.django_db


def test_crear_usuario_normaliza_correo_y_cifra_contrasena():
    usuario = Usuario.objects.create_user(email="  Ana@CampusUcc.EDU.CO ", password=CONTRASENA)

    assert usuario.email == "ana@campusucc.edu.co"
    assert usuario.password != CONTRASENA
    assert usuario.check_password(CONTRASENA)


def test_usuario_nuevo_es_estudiante_sin_privilegios():
    usuario = Usuario.objects.create_user(email="ana@campusucc.edu.co", password=CONTRASENA)

    assert usuario.rol == Rol.ESTUDIANTE
    assert not usuario.is_staff
    assert not usuario.is_superuser
    assert not usuario.es_docente


def test_crear_usuario_sin_correo_falla():
    with pytest.raises(ValueError):
        Usuario.objects.create_user(email="", password=CONTRASENA)


def test_superusuario_es_docente_admin():
    admin = Usuario.objects.create_superuser(email="docente@ucc.edu.co", password=CONTRASENA)

    assert admin.is_staff and admin.is_superuser
    assert admin.es_docente


def test_superusuario_sin_is_staff_falla():
    with pytest.raises(ValueError):
        Usuario.objects.create_superuser(email="x@ucc.edu.co", password=CONTRASENA, is_staff=False)


def test_correo_duplicado_con_otras_mayusculas_es_rechazado_por_la_base_de_datos():
    Usuario.objects.create_user(email="ana@campusucc.edu.co", password=CONTRASENA)

    # Se salta el gestor (que normaliza) para comprobar la restricción de la base de datos.
    with pytest.raises(IntegrityError):
        Usuario(email="ANA@campusucc.edu.co").save()
