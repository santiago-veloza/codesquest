import { useMutation } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { Link } from 'react-router'

import { ingresar } from '../api/cuenta'
import { erroresDeCampo, mensajeGeneral } from '../api/errores'
import type { DatosIngreso } from '../api/tipos'
import { RUTAS } from '../app/rutas'
import { useAlIniciarSesion } from '../app/useAlIniciarSesion'
import { Aviso } from '../componentes/ui/Aviso'
import { Boton } from '../componentes/ui/Boton'
import { CampoTexto } from '../componentes/ui/CampoTexto'
import { Tarjeta } from '../componentes/ui/Tarjeta'
import { textos } from '../textos/es'
import estilos from './Paginas.module.css'

const CAMPOS = ['email', 'password'] as const

export function Ingresar() {
  const alIniciarSesion = useAlIniciarSesion()
  const envio = useMutation({ mutationFn: ingresar, onSuccess: alIniciarSesion })

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const credenciales: DatosIngreso = {
      email: String(datos.get('email') ?? ''),
      password: String(datos.get('password') ?? ''),
    }
    envio.mutate(credenciales)
  }

  const mensaje = mensajeGeneral(envio.error, CAMPOS)

  return (
    <div className={estilos.formulario}>
      <Tarjeta>
        <h1 className={estilos.tituloPixel}>{textos.ingresar.titulo}</h1>
        {mensaje && <Aviso tipo="error">{mensaje}</Aviso>}
        <form onSubmit={enviar} noValidate>
          <CampoTexto
            etiqueta={textos.campos.email}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={textos.campos.ejemploCorreo}
            required
            errores={erroresDeCampo(envio.error, 'email')}
          />
          <CampoTexto
            etiqueta={textos.campos.contrasena}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            errores={erroresDeCampo(envio.error, 'password')}
          />
          <Boton type="submit" anchoCompleto cargando={envio.isPending} textoCargando={textos.ingresar.enviando}>
            {textos.ingresar.enviar}
          </Boton>
        </form>
        <p className={estilos.pie}>
          {textos.ingresar.sinCuenta} <Link to={RUTAS.registro}>{textos.ingresar.crearUna}</Link>
        </p>
      </Tarjeta>
    </div>
  )
}
