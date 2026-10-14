from django.urls import path

from .views import VistaDesafio, VistaDesafiosDeMundo, VistaMundo, VistaMundos

urlpatterns = [
    path("mundos/", VistaMundos.as_view(), name="mundos"),
    path("mundos/<int:pk>/", VistaMundo.as_view(), name="mundo"),
    path("mundos/<int:pk>/desafios/", VistaDesafiosDeMundo.as_view(), name="desafios-de-mundo"),
    path("desafios/<int:pk>/", VistaDesafio.as_view(), name="desafio"),
]
