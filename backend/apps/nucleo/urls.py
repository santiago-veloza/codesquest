from django.db import transaction
from django.urls import path

from .views import VistaSalud

urlpatterns = [
    # Sin transacción: si la base de datos está caída, la vista debe poder responder 503.
    path("salud/", transaction.non_atomic_requests(VistaSalud.as_view()), name="salud"),
]
