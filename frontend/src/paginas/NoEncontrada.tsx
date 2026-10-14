import { Link } from 'react-router'

import { RUTAS } from '../app/rutas'
import { textos } from '../textos/es'
import estilos from './Paginas.module.css'

export function NoEncontrada() {
  return (
    <div className={estilos.portada}>
      <h1 className={estilos.tituloPixel}>{textos.noEncontrada.titulo}</h1>
      <p className={estilos.descripcion}>{textos.noEncontrada.descripcion}</p>
      <Link to={RUTAS.inicio} className={estilos.enlaceBoton}>
        {textos.noEncontrada.volver}
      </Link>
    </div>
  )
}
