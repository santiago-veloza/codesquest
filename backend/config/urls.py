from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.progreso.admin import exportar_estudiantes_csv, vista_estadisticas

api_v1 = [
    path("", include("apps.nucleo.urls")),
    path("", include("apps.usuarios.urls")),
    path("", include("apps.contenido.urls")),
    path("", include("apps.progreso.urls")),
    path("", include("apps.gamificacion.urls")),
    path("esquema/", SpectacularAPIView.as_view(), name="esquema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="esquema"), name="docs"),
]

urlpatterns = [
    # Estadísticas del docente dentro del admin: admin_view exige sesión de staff (si no, va al login).
    path("admin/estadisticas/", admin.site.admin_view(vista_estadisticas), name="admin-estadisticas"),
    path(
        "admin/estadisticas/estudiantes.csv",
        admin.site.admin_view(exportar_estudiantes_csv),
        name="admin-estadisticas-csv",
    ),
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
]

# Errores fuera de DRF también responden con el formato uniforme en JSON.
handler404 = "apps.nucleo.views.no_encontrado"
handler500 = "apps.nucleo.views.error_servidor"
