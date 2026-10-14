import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { aBloques } from './markdownBasico'

describe('aBloques', () => {
  it('reconoce títulos, citas, listas y párrafos, y quita las marcas de formato', () => {
    const md = '# Título\n\n> **Ojo:** borrador\n> segunda línea\n\n- uno\n- **dos**\n\nUn `párrafo`\ncontinuado.\n\n## Sub'

    expect(aBloques(md)).toEqual([
      { tipo: 'titulo', nivel: 1, texto: 'Título' },
      { tipo: 'cita', texto: 'Ojo: borrador segunda línea' },
      { tipo: 'lista', elementos: ['uno', 'dos'] },
      { tipo: 'parrafo', texto: 'Un párrafo continuado.' },
      { tipo: 'titulo', nivel: 2, texto: 'Sub' },
    ])
  })

  it('separa el texto y la lista aunque no haya línea en blanco entre ellos', () => {
    expect(aBloques('**Datos:**\n- correo\n- apodo')).toEqual([
      { tipo: 'parrafo', texto: 'Datos:' },
      { tipo: 'lista', elementos: ['correo', 'apodo'] },
    ])
  })

  it('no interpreta HTML: el texto se mantiene literal (React lo escapa)', () => {
    expect(aBloques('<script>alert(1)</script>')).toEqual([{ tipo: 'parrafo', texto: '<script>alert(1)</script>' }])
  })

  it('el aviso de privacidad real se convierte sin perder secciones', () => {
    const aviso = readFileSync(resolve(process.cwd(), '../docs/legal/aviso_privacidad.md'), 'utf8')

    const bloques = aBloques(aviso)

    expect(bloques[0]).toMatchObject({ tipo: 'titulo', nivel: 1 })
    expect(bloques.some((b) => b.tipo === 'lista')).toBe(true)
    expect(JSON.stringify(bloques)).toContain('Ley 1581 de 2012')
  })
})
