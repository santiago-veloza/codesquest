from django.urls import path

from .views import VistaCompletarMundo, VistaIntentos, VistaReiniciarMundo

urlpatterns = [
    path("desafios/<int:pk>/intentos/", VistaIntentos.as_view(), name="intentos"),
    path("mundos/<int:pk>/completar/", VistaCompletarMundo.as_view(), name="completar-mundo"),
    path("mundos/<int:pk>/reiniciar/", VistaReiniciarMundo.as_view(), name="reiniciar-mundo"),
]
