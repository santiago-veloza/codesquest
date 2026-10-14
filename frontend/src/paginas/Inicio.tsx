import { Link } from 'react-router'

import { RUTAS } from '../app/rutas'
import { useSesion } from '../estado/sesion'
import { textos } from '../textos/es'
import estilos from './Paginas.module.css'

export function Inicio() {
  const autenticada = useSesion((s) => s.estado === 'autenticada')

  return (
    <div className={estilos.portada}>
      <h1 className={estilos.tituloPixel}>{textos.inicio.titulo}</h1>
      <p className={estilos.lema}>{textos.app.lema}</p>
      <p className={estilos.descripcion}>{textos.inicio.descripcion}</p>
      <div className={estilos.acciones}>
        {autenticada ? (
          <Link to={RUTAS.mapa} className={`${estilos.enlaceBoton} ${estilos.enlacePrimario}`}>
            {textos.inicio.continuar}
          </Link>
        ) : (
          <>
            <Link to={RUTAS.registro} className={`${estilos.enlaceBoton} ${estilos.enlacePrimario}`}>
              {textos.inicio.empezar}
            </Link>
            <Link to={RUTAS.ingresar} className={estilos.enlaceBoton}>
              {textos.inicio.yaTengoCuenta}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
