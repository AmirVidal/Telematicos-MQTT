import { useEffect, useRef, useState } from 'react'
import './Header.css'
export default function Header({ user, status, onLogout }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAbierto(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuAbierto(false)
      }
    }

    document.addEventListener('pointerdown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const estados = {
    connected: 'Broker conectado',
    connecting: 'Conectando al broker',
    reconnecting: 'Reconectando al broker',
    disconnected: 'Broker desconectado'
  }

  const estadoTexto = estados[status] ?? estados.disconnected

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-marca">
        <div className="dashboard-header-logo" aria-hidden="true">
          MQ
        </div>

        <div>
          <p className="dashboard-header-subtitulo">Servicios Telemáticos</p>
          <h1>Sistema de mensajería MQTT</h1>
        </div>
      </div>

      <div className="dashboard-header-acciones">
        <div className={`dashboard-broker dashboard-broker--${status}`} role="status">
          <span className="dashboard-broker-indicador" aria-hidden="true" />
          <span>{estadoTexto}</span>
        </div>

        <div className="dashboard-usuario" ref={menuRef}>
          <button
            type="button"
            className="dashboard-usuario-trigger"
            aria-expanded={menuAbierto}
            aria-haspopup="true"
            onClick={() => setMenuAbierto((anterior) => !anterior)}
          >
            <span className="dashboard-usuario-avatar" aria-hidden="true">
              {user.name.charAt(0).toUpperCase()}
            </span>

            <span className="dashboard-usuario-info">
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </span>

            <span aria-hidden="true">{menuAbierto ? '⌃' : '⌄'}</span>
          </button>

          {menuAbierto && (
            <div className="dashboard-usuario-menu">
              <div className="dashboard-usuario-detalle">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </div>

              <button type="button" onClick={onLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
