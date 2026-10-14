from django.urls import path

from .views import VistaLogin, VistaLogout, VistaPerfil, VistaRefresh, VistaRegistro

urlpatterns = [
    path("auth/registro/", VistaRegistro.as_view(), name="registro"),
    path("auth/login/", VistaLogin.as_view(), name="login"),
    path("auth/refresh/", VistaRefresh.as_view(), name="refresh"),
    path("auth/logout/", VistaLogout.as_view(), name="logout"),
    path("perfil/", VistaPerfil.as_view(), name="perfil"),
]
