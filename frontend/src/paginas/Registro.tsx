import { useMutation } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'

import { registrar } from '../api/cuenta'
import { erroresDeCampo, mensajeGeneral } from '../api/errores'
import { AVATARES, type Avatar, type DatosRegistro } from '../api/tipos'
import { RUTAS } from '../app/rutas'
import { useAlIniciarSesion } from '../app/useAlIniciarSesion'
import { Aviso } from '../componentes/ui/Aviso'
import { Boton } from '../componentes/ui/Boton'
import { CampoTexto } from '../componentes/ui/CampoTexto'
import { Casilla } from '../componentes/ui/Casilla'
import { Tarjeta } from '../componentes/ui/Tarjeta'
import { textos } from '../textos/es'
import estilos from './Paginas.module.css'

const CAMPOS = ['email', 'password', 'apodo', 'avatar', 'acepta_privacidad'] as const

export function Registro() {
  const alIniciarSesion = useAlIniciarSesion()
  const envio = useMutation({ mutationFn: registrar, onSuccess: alIniciarSesion })
  const [avatar, setAvatar] = useState<Avatar>('byte')
  const [faltaConsentimiento, setFaltaConsentimiento] = useState(false)

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const acepta = datos.get('acepta_privacidad') === 'on'
    // Validación local solo para ahorrar un viaje: el servidor vuelve a validar todo.
    setFaltaConsentimiento(!acepta)
    if (!acepta) return
    const registro: DatosRegistro = {
      email: String(datos.get('email') ?? ''),
      password: String(datos.get('password') ?? ''),
      apodo: String(datos.get('apodo') ?? ''),
      avatar,
      acepta_privacidad: true,
    }
    envio.mutate(registro)
  }

  const mensaje = mensajeGeneral(envio.error, CAMPOS)
  const erroresConsentimiento = faltaConsentimiento
    ? [textos.registro.debesAceptar]
    : erroresDeCampo(envio.error, 'acepta_privacidad')

  return (
    <div className={estilos.formulario}>
      <Tarjeta>
        <h1 className={estilos.tituloPixel}>{textos.registro.titulo}</h1>
        {mensaje && <Aviso tipo="error">{mensaje}</Aviso>}
        <form onSubmit={enviar} noValidate>
          <CampoTexto
            etiqueta={textos.campos.email}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={textos.campos.ejemploCorreo}
            required
            ayuda={textos.registro.ayudaCorreo}
            errores={erroresDeCampo(envio.error, 'email')}
          />
          <CampoTexto
            etiqueta={textos.campos.apodo}
            name="apodo"
            autoComplete="nickname"
            required
            ayuda={textos.registro.ayudaApodo}
            errores={erroresDeCampo(envio.error, 'apodo')}
          />
          <CampoTexto
            etiqueta={textos.campos.contrasena}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            ayuda={textos.registro.ayudaContrasena}
            errores={erroresDeCampo(envio.error, 'password')}
          />
          <fieldset className={estilos.avatares}>
            <legend>{textos.registro.elegirAvatar}</legend>
            {AVATARES.map((opcion) => (
              <label key={opcion} className={estilos.avatar}>
                <input
                  type="radio"
                  name="avatar"
                  value={opcion}
                  checked={avatar === opcion}
                  onChange={() => setAvatar(opcion)}
                />
                <img className={estilos.avatarFigura} src={`/img/avatares/${opcion}.png`} alt="" />
                {textos.avatares[opcion]}
              </label>
            ))}
          </fieldset>
          <Casilla name="acepta_privacidad" errores={erroresConsentimiento}>
            {textos.registro.aceptoPrivacidad}{' '}
            <Link to={RUTAS.privacidad} target="_blank" rel="noopener noreferrer">
              {textos.registro.avisoPrivacidad}
            </Link>
          </Casilla>
          <Boton type="submit" anchoCompleto cargando={envio.isPending} textoCargando={textos.registro.enviando}>
            {textos.registro.enviar}
          </Boton>
        </form>
        <p className={estilos.pie}>
          {textos.registro.yaTienesCuenta} <Link to={RUTAS.ingresar}>{textos.registro.ingresa}</Link>
        </p>
      </Tarjeta>
    </div>
  )
}
