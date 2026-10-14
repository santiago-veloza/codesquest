from django.urls import path

from .views import VistaLogros

urlpatterns = [
    path("logros/", VistaLogros.as_view(), name="logros"),
]
