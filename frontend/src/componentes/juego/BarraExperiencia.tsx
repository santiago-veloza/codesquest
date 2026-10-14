import type { Perfil } from '../../api/tipos'
import { textos } from '../../textos/es'
import { BarraProgreso } from '../ui/BarraProgreso'

type DatosExperiencia = Pick<
  Perfil,
  'nivel' | 'experiencia' | 'experiencia_nivel_actual' | 'experiencia_siguiente_nivel'
>

/** XP dentro del nivel actual. Los umbrales vienen del servidor (no se repite la fórmula aquí). */
export function BarraExperiencia({ perfil, compacta = false }: { perfil: DatosExperiencia; compacta?: boolean }) {
  const avance = perfil.experiencia - perfil.experiencia_nivel_actual
  const meta = perfil.experiencia_siguiente_nivel - perfil.experiencia_nivel_actual
  return (
    <BarraProgreso
      etiqueta={textos.experiencia.etiqueta(perfil.nivel)}
      valor={avance}
      maximo={meta}
      textoValor={compacta ? textos.experiencia.corta(avance, meta) : textos.experiencia.hastaSiguiente(avance, meta)}
      variante="xp"
    />
  )
}
