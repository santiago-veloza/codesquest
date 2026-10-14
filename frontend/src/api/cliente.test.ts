import { beforeEach, describe, expect, it } from 'vitest'

import { useSesion } from '../estado/sesion'
import { cuerpoError, prepararSesion, respuestaJson, simularFetch } from '../pruebas/utilidades'
import { textos } from '../textos/es'
import { ErrorApi, solicitar } from './cliente'

const esRefresh = (url: string) => url.endsWith('/auth/refresh/')
const autorizacion = (init: RequestInit) => (init.headers as Record<string, string>).Authorization

beforeEach(() => {
  prepararSesion('autenticada')
  useSesion.setState({ access: 'viejo' })
})

describe('cliente de la API', () => {
  it('envía el access token de la sesión', async () => {
    const fetch = simularFetch(() => respuestaJson(200, { ok: true }))

    await solicitar('/perfil/')

    expect(fetch).toHaveBeenCalledWith('/api/v1/perfil/', expect.objectContaining({ credentials: 'same-origin' }))
    expect(autorizacion(fetch.mock.calls[0]![1]!)).toBe('Bearer viejo')
  })

  it('ante un 401 renueva la sesión una vez y reintenta con el token nuevo', async () => {
    const fetch = simularFetch((url, init) => {
      if (esRefresh(url)) return respuestaJson(200, { access: 'nuevo' })
      return autorizacion(init) === 'Bearer nuevo' ? respuestaJson(200, { apodo: 'Ada' }) : respuestaJson(401)
    })

    const datos = await solicitar<{ apodo: string }>('/perfil/')

    expect(datos.apodo).toBe('Ada')
    expect(fetch).toHaveBeenCalledTimes(3)
    const llamadaRefresh = fetch.mock.calls.find(([url]) => esRefresh(String(url)))!
    expect(llamadaRefresh[1]!.headers).toMatchObject({ 'X-CodeQuest-Cliente': 'web' })
    expect(useSesion.getState().access).toBe('nuevo')
  })

  it('varios 401 simultáneos comparten una sola renovación (la rotación no se rompe)', async () => {
    const fetch = simularFetch((url, init) => {
      if (esRefresh(url)) return respuestaJson(200, { access: 'nuevo' })
      return autorizacion(init) === 'Bearer nuevo' ? respuestaJson(200, {}) : respuestaJson(401)
    })

    await Promise.all([solicitar('/perfil/'), solicitar('/mundos/'), solicitar('/logros/')])

    expect(fetch.mock.calls.filter(([url]) => esRefresh(String(url)))).toHaveLength(1)
  })

  it('si la renovación falla, cierra la sesión y propaga el error original', async () => {
    simularFetch((url) => (esRefresh(url) ? respuestaJson(401) : respuestaJson(401, cuerpoError('no_autenticado'))))

    const error = await solicitar('/perfil/').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ErrorApi)
    expect((error as ErrorApi).codigo).toBe('no_autenticado')
    expect(useSesion.getState().estado).toBe('anonima')
    expect(useSesion.getState().access).toBeNull()
  })

  it('las peticiones no autenticadas no envían token ni intentan renovar', async () => {
    const fetch = simularFetch(() => respuestaJson(401, cuerpoError('credenciales_invalidas')))

    await expect(solicitar('/auth/login/', { metodo: 'POST', cuerpo: {}, autenticada: false })).rejects.toThrow(
      textos.errores.porCodigo.credenciales_invalidas,
    )
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(autorizacion(fetch.mock.calls[0]![1]!)).toBeUndefined()
  })

  it('convierte el formato uniforme de errores en ErrorApi con detalles por campo', async () => {
    simularFetch(() => respuestaJson(400, cuerpoError('datos_invalidos', 'Datos inválidos.', { email: ['Correo inválido.'] })))

    const error = (await solicitar('/auth/registro/', { metodo: 'POST', autenticada: false }).catch((e: unknown) => e)) as ErrorApi

    expect(error.estado).toBe(400)
    expect(error.codigo).toBe('datos_invalidos')
    expect(error.detalles).toEqual({ email: ['Correo inválido.'] })
  })

  it('una respuesta de error sin el formato esperado da un mensaje genérico', async () => {
    simularFetch(() => new Response('<html>502</html>', { status: 502 }))

    await expect(solicitar('/perfil/')).rejects.toMatchObject({ estado: 502, message: textos.estados.errorGenerico })
  })

  it('sin conexión lanza un error didáctico y no cierra la sesión', async () => {
    simularFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    await expect(solicitar('/perfil/')).rejects.toMatchObject({ estado: 0, codigo: 'sin_conexion' })
    expect(useSesion.getState().estado).toBe('autenticada')
  })

  it('una respuesta 204 devuelve undefined', async () => {
    simularFetch(() => new Response(null, { status: 204 }))

    await expect(solicitar('/auth/logout/', { metodo: 'POST', autenticada: false })).resolves.toBeUndefined()
  })
})
