// Fuente única del aviso: docs/legal/aviso_privacidad.md (el mismo texto que revisa la universidad).
import aviso from '../../../docs/legal/aviso_privacidad.md?raw'
import { aBloques } from '../textos/markdownBasico'
import estilos from './Paginas.module.css'

const BLOQUES = aBloques(aviso)

export function Privacidad() {
  return (
    <article className={estilos.documento}>
      {BLOQUES.map((bloque, i) => {
        switch (bloque.tipo) {
          case 'titulo':
            return bloque.nivel === 1 ? <h1 key={i}>{bloque.texto}</h1> : <h2 key={i}>{bloque.texto}</h2>
          case 'cita':
            return <blockquote key={i}>{bloque.texto}</blockquote>
          case 'lista':
            return (
              <ul key={i}>
                {bloque.elementos.map((elemento) => (
                  <li key={elemento}>{elemento}</li>
                ))}
              </ul>
            )
          case 'parrafo':
            return <p key={i}>{bloque.texto}</p>
        }
      })}
    </article>
  )
}
