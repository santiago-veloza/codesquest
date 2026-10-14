import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'

import { cerrarSesion } from '../api/cuenta'
import { BarraExperiencia } from '../componentes/juego/BarraExperiencia'
import { ControlSonido } from '../componentes/juego/ControlSonido'
import { Notificaciones } from '../componentes/juego/Notificaciones'
import { Boton } from '../componentes/ui/Boton'
import { useSesion } from '../estado/sesion'
import { borrarTodosLosBorradores } from '../utilidades/borradores'
import { textos } from '../textos/es'
import estilos from './Layout.module.css'
import { useArranqueSesion } from './arranqueSesion'
import { RUTAS } from './rutas'

export function Layout() {
  useArranqueSesion()
  const { estado, perfil } = useSesion()
  const salir = useCerrarSesion()

  return (
    <div className={estilos.pagina}>
      <a href="#contenido" className={estilos.saltar}>
        {textos.app.saltarAlContenido}
      </a>
      <header className={estilos.encabezado}>
        <Link to={RUTAS.inicio} className={estilos.marca}>
          {textos.app.nombre}
        </Link>
        <nav aria-label="Principal" className={estilos.nav}>
          {estado === 'autenticada' && perfil ? (
            <>
              <NavLink to={RUTAS.mapa}>{textos.navegacion.mapa}</NavLink>
              <NavLink to={RUTAS.logros}>{textos.navegacion.logros}</NavLink>
              <span className={estilos.apodo}>{perfil.apodo}</span>
              <div className={estilos.experiencia}>
                <BarraExperiencia perfil={perfil} compacta />
              </div>
              <ControlSonido />
              <Boton variante="fantasma" onClick={() => salir.mutate()} cargando={salir.isPending}>
                {textos.navegacion.cerrarSesion}
              </Boton>
            </>
          ) : (
            estado === 'anonima' && (
              <>
                <NavLink to={RUTAS.ingresar}>{textos.navegacion.ingresar}</NavLink>
                <NavLink to={RUTAS.registro}>{textos.navegacion.crearCuenta}</NavLink>
              </>
            )
          )}
        </nav>
      </header>
      <main id="contenido" tabIndex={-1} className={estilos.contenido}>
        <Outlet />
      </main>
      {estado === 'autenticada' && <Notificaciones />}
    </div>
  )
}

function useCerrarSesion() {
  const clienteConsultas = useQueryClient()
  const navegar = useNavigate()
  return useMutation({
    mutationFn: cerrarSesion,
    // Aunque el servidor falle, en este dispositivo la sesión se cierra igual. El motivo "usuario"
    // hace que RutaProtegida también lleve al inicio: las dos navegaciones coinciden y no compiten
    // (React Router aplica la navegación en una transición y no se puede asumir el orden).
    onSettled: () => {
      useSesion.getState().cerrar('usuario')
      borrarTodosLosBorradores()
      clienteConsultas.clear()
      void navegar(RUTAS.inicio, { replace: true })
    },
  })
}
