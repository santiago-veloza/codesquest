import { Boton } from '../../componentes/ui/Boton'
import { textos } from '../../textos/es'
import estilos from './Desafio.module.css'

interface Props {
  pistas: string[]
  /** Cuántas pistas ya se revelaron (se envía con el intento: cada pista resta XP). */
  reveladas: number
  alRevelar: () => void
}

/** Pistas progresivas: de menos a más reveladora, una a la vez. */
export function Pistas({ pistas, reveladas, alRevelar }: Props) {
  return (
    <section aria-labelledby="titulo-pistas" className={estilos.pistas}>
      <h2 id="titulo-pistas">{textos.desafio.pistas}</h2>
      <ol aria-live="polite">
        {pistas.slice(0, reveladas).map((pista, i) => (
          <li key={i}>
            <strong>{textos.desafio.pistaNumero(i + 1)}:</strong> {pista}
          </li>
        ))}
      </ol>
      {reveladas < pistas.length ? (
        <Boton variante="secundario" onClick={alRevelar}>
          {textos.desafio.verPista(reveladas + 1, pistas.length)}
        </Boton>
      ) : (
        <p className={estilos.nota}>{textos.desafio.sinMasPistas}</p>
      )}
    </section>
  )
}
