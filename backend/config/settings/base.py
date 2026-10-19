"""Configuración común a todos los entornos. Los secretos llegan solo por variables de entorno."""

from datetime import timedelta
from pathlib import Path

import environ

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
RAIZ_PROYECTO = BACKEND_DIR.parent

env = environ.Env()
# El .env vive en la raíz del proyecto (lo comparte con docker-compose). Si no existe, se usan
# las variables del sistema (así funciona en Docker/producción).
environ.Env.read_env(RAIZ_PROYECTO / ".env")

SECRET_KEY = env.str("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceros
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "corsheaders",
    # Propias
    "apps.nucleo",
    "apps.usuarios",
    "apps.contenido",
    "apps.progreso",
    "apps.gamificacion",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # CORS debe ir lo más arriba posible, antes de CommonMiddleware.
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env.str("POSTGRES_DB"),
        "USER": env.str("POSTGRES_USER"),
        "PASSWORD": env.str("POSTGRES_PASSWORD"),
        "HOST": env.str("POSTGRES_HOST", default="127.0.0.1"),
        "PORT": env.int("POSTGRES_PORT", default=5432),
        # Cada petición HTTP en una transacción: si algo falla, no queda progreso a medias.
        "ATOMIC_REQUESTS": True,
    }
}

AUTH_USER_MODEL = "usuarios.Usuario"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BACKEND_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Mundos, desafíos y logros como datos versionados (ver content/README.md).
CONTENIDO_DIR = BACKEND_DIR / "content"
# Código Python compartido con el navegador (reglas AST de los desafíos).
COMPARTIDO_PY_DIR = BACKEND_DIR / "compartido" / "python"

# --- Seguridad común ---
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SESSION_COOKIE_HTTPONLY = True

# --- CORS: solo los orígenes del frontend ---
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
# Necesario para enviar la cookie HttpOnly del refresh token (paso de autenticación).
CORS_ALLOW_CREDENTIALS = True

# --- Django REST Framework ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Seguro por defecto: cada vista pública debe declararse explícitamente con AllowAny.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "apps.nucleo.paginacion.PaginacionEstandar",
    "EXCEPTION_HANDLER": "apps.nucleo.excepciones.manejador_errores",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env.str("THROTTLE_ANONIMO", default="60/min"),
        "user": env.str("THROTTLE_USUARIO", default="300/min"),
        # Autenticación: límites estrictos contra fuerza bruta y registros masivos.
        "auth_login": env.str("THROTTLE_LOGIN_IP", default="10/min"),
        "auth_login_correo": env.str("THROTTLE_LOGIN_CORREO", default="5/min"),
        "auth_registro": env.str("THROTTLE_REGISTRO", default="5/hour"),
        "auth_refresh": env.str("THROTTLE_REFRESH", default="30/min"),
        "intentos": env.str("THROTTLE_INTENTOS", default="60/min"),
    },
}

# --- JWT (se usan en el paso de autenticación) ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTOS", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DIAS", default=7)),
    # Cada refresh entrega un refresh nuevo y bloquea el anterior (detecta robo y reutilización).
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# --- Cookie del refresh token ---
# HttpOnly: JavaScript no la puede leer. SameSite=Strict + mismo origen (proxy de Vite / Nginx).
# Path: solo viaja a /api/v1/auth/ (refresh y logout), no a cada petición.
COOKIE_REFRESH = {
    "nombre": "cq_refresh",
    "ruta": "/api/v1/auth/",
    "samesite": "Strict",
    "secure": env.bool("COOKIE_SEGURA", default=not DEBUG),
}
# Cabecera obligatoria en refresh/logout: un sitio externo no puede enviarla sin pasar por CORS (anti-CSRF).
CABECERA_CLIENTE = {"nombre": "X-CodeQuest-Cliente", "valor": "web"}

# --- Cuentas: solo correos institucionales (se puede ampliar, p. ej. para docentes) ---
DOMINIOS_CORREO_PERMITIDOS = env.list("DOMINIOS_CORREO_PERMITIDOS", default=["campusucc.edu.co"])

# --- Ley 1581 de 2012: versión vigente del aviso de privacidad (docs/legal/aviso_privacidad.md) ---
VERSION_AVISO_PRIVACIDAD = "1.0"


# --- OpenAPI ---
SPECTACULAR_SETTINGS = {
    "TITLE": "CODEQUEST API",
    "DESCRIPTION": "API de la plataforma educativa CODEQUEST — La aventura del programador.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    # Esquemas separados de petición y respuesta: los tipos TypeScript generados son exactos.
    "COMPONENT_SPLIT_REQUEST": True,
}

# --- Logs: sin datos sensibles (nunca contraseñas, tokens ni código de estudiantes) ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "{asctime} {levelname} {name}: {message}", "style": "{"}},
    "handlers": {"consola": {"class": "logging.StreamHandler", "formatter": "simple"}},
    "root": {"handlers": ["consola"], "level": env.str("DJANGO_LOG_LEVEL", default="INFO")},
}
