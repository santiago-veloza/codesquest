import { Aviso } from '../../componentes/ui/Aviso'
import type { Veredicto } from '../../motor/evaluador'
import { textos } from '../../textos/es'
import estilos from './Desafio.module.css'

/** Veredicto didáctico + consola con lo que mostró el programa. Se anuncia a lectores de pantalla. */
export function PanelResultado({ veredicto }: { veredicto: Veredicto | null }) {
  const salida = veredicto?.resultado?.salida ?? ''

  return (
    <section aria-labelledby="titulo-consola" className={estilos.resultado}>
      {veredicto && <MensajeVeredicto veredicto={veredicto} />}
      <h2 id="titulo-consola">{textos.desafio.consola}</h2>
      <pre className={estilos.consola} data-prueba="consola">
        {salida || <span className={estilos.nota}>{textos.desafio.consolaVacia}</span>}
      </pre>
    </section>
  )
}

function MensajeVeredicto({ veredicto }: { veredicto: Veredicto }) {
  switch (veredicto.estado) {
    case 'correcto':
      return (
        <Aviso tipo="exito">
          <strong>{textos.desafio.correcto}</strong> {textos.desafio.correctoDetalle(veredicto.variantesProbadas)}
        </Aviso>
      )
    case 'incorrecto':
      return (
        <Aviso tipo="error">
          <strong>{textos.desafio.incorrecto}.</strong> {veredicto.contexto && `${veredicto.contexto}:`}
          <ul>
            {veredicto.fallos.map((fallo) => (
              <li key={fallo}>{fallo}</li>
            ))}
          </ul>
        </Aviso>
      )
    case 'error':
      return (
        <Aviso tipo="error">
          <strong>{veredicto.error.titulo}.</strong> {veredicto.error.explicacion}
          {veredicto.error.sugerencia && <p>{veredicto.error.sugerencia}</p>}
          {veredicto.contexto && <p className={estilos.nota}>{veredicto.contexto}.</p>}
        </Aviso>
      )
  }
}
