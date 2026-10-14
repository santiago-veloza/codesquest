from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as ErrorValidacionDjango
from django.core.validators import RegexValidator
from rest_framework import serializers

from apps.gamificacion.servicios import umbral_de_nivel
from config import juego

from .models import Avatar, Perfil, Usuario, correo_institucional, normalizar_correo

MENSAJE_CORREO_NO_DISPONIBLE = "No es posible registrarse con este correo."
MENSAJE_FALTA_CONSENTIMIENTO = "Debes aceptar el aviso de privacidad para crear tu cuenta."
MENSAJE_CORREO_NO_INSTITUCIONAL = "Usa tu correo institucional ({dominios})."


def campo_apodo(**opciones):
    return serializers.CharField(
        min_length=juego.LARGO_MINIMO_APODO,
        max_length=juego.LARGO_MAXIMO_APODO,
        validators=[
            RegexValidator(
                r"^[\w .\-]+$",
                "El apodo solo puede tener letras, números, espacios, puntos, guiones y guiones bajos.",
            )
        ],
        **opciones,
    )


class RegistroSerializer(serializers.Serializer):
    """Solo acepta estos campos: rol, XP o nivel enviados por el cliente se ignoran."""

    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    apodo = campo_apodo()
    avatar = serializers.ChoiceField(choices=Avatar.choices, default=Avatar.BYTE)
    acepta_privacidad = serializers.BooleanField()

    def validate_email(self, valor):
        correo = normalizar_correo(valor)
        if not correo_institucional(correo):
            dominios = ", ".join(f"@{d}" for d in settings.DOMINIOS_CORREO_PERMITIDOS)
            raise serializers.ValidationError(MENSAJE_CORREO_NO_INSTITUCIONAL.format(dominios=dominios))
        if Usuario.objects.filter(email=correo).exists():
            # Limitación conocida: el registro sí revela si un correo existe. Evitarlo exige
            # verificación por email (fuera del MVP); se mitiga con un límite estricto de registros.
            raise serializers.ValidationError(MENSAJE_CORREO_NO_DISPONIBLE)
        return correo

    def validate_acepta_privacidad(self, valor):
        if valor is not True:
            raise serializers.ValidationError(MENSAJE_FALTA_CONSENTIMIENTO)
        return valor

    def validate(self, datos):
        try:
            # Con el usuario provisional se detectan contraseñas parecidas al correo.
            validate_password(datos["password"], user=Usuario(email=datos.get("email", "")))
        except ErrorValidacionDjango as error:
            raise serializers.ValidationError({"password": list(error.messages)}) from error
        return datos


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)


class PerfilSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="usuario.email", read_only=True)
    rol = serializers.CharField(source="usuario.rol", read_only=True)
    fecha_registro = serializers.DateTimeField(source="usuario.fecha_registro", read_only=True)
    apodo = campo_apodo(required=False)
    # Para dibujar la barra de experiencia: XP con la que empezó el nivel actual y la del siguiente.
    experiencia_nivel_actual = serializers.SerializerMethodField()
    experiencia_siguiente_nivel = serializers.SerializerMethodField()

    class Meta:
        model = Perfil
        fields = [
            "email",
            "rol",
            "fecha_registro",
            "apodo",
            "avatar",
            "experiencia",
            "puntos",
            "nivel",
            "experiencia_nivel_actual",
            "experiencia_siguiente_nivel",
            "energia",
        ]
        # Los valores de juego solo los cambia el servidor (gamificación), nunca el cliente.
        read_only_fields = ["experiencia", "puntos", "nivel", "energia"]

    def get_experiencia_nivel_actual(self, perfil) -> int:
        return umbral_de_nivel(perfil.nivel)

    def get_experiencia_siguiente_nivel(self, perfil) -> int:
        return umbral_de_nivel(perfil.nivel + 1)


class SesionSerializer(serializers.Serializer):
    """Respuesta de registro y login (solo para la documentación OpenAPI)."""

    access = serializers.CharField()
    perfil = PerfilSerializer()


class AccessSerializer(serializers.Serializer):
    access = serializers.CharField()
