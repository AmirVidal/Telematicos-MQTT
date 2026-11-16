import { useEffect, useRef, useState } from 'react'
import './Header.css'
export default function Header({ user, status, url, clientId, error, onLogout }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)
  const [panelMqttAbierto, setPanelMqttAbierto] = useState(false)
  const panelMqttRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAbierto(false)
      }

      if (panelMqttRef.current && !panelMqttRef.current.contains(event.target)) {
        setPanelMqttAbierto(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuAbierto(false)
        setPanelMqttAbierto(false)
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
        <div className={`dashboard-broker dashboard-broker--${status}`} ref={panelMqttRef}>
          <button
            type="button"
            className="dashboard-broker-trigger"
            aria-expanded={panelMqttAbierto}
            aria-controls="dashboard-panel-mqtt"
            onClick={() => {
              setPanelMqttAbierto((anterior) => !anterior)
              setMenuAbierto(false)
            }}
          >
            <span className="dashboard-broker-indicador" aria-hidden="true" />
            <span role="status">{estadoTexto}</span>
            <span aria-hidden="true">{panelMqttAbierto ? '⌃' : '⌄'}</span>
          </button>

          {panelMqttAbierto && (
            <div className="dashboard-broker-panel" id="dashboard-panel-mqtt">
              <div className="dashboard-broker-panel-cabecera">
                <strong>Información de conexión MQTT</strong>
                <span className="dashboard-broker-panel-protocolo">WebSocket</span>
              </div>

              <div className={`dashboard-broker-estado dashboard-broker-estado--${status}`}>
                <span className="dashboard-broker-indicador" aria-hidden="true" />
                <div>
                  <strong>{estadoTexto}</strong>
                  <p>
                    {status === 'connected'
                      ? 'La conexión con el broker MQTT está activa.'
                      : status === 'reconnecting'
                        ? 'Intentando restablecer la conexión automáticamente.'
                        : status === 'connecting'
                          ? 'Estableciendo conexión con el broker MQTT.'
                          : 'La conexión con el broker MQTT no está disponible.'}
                  </p>
                </div>
              </div>

              <dl className="dashboard-broker-datos">
                <div>
                  <dt>Dirección del broker</dt>
                  <dd>{url}</dd>
                </div>

                <div>
                  <dt>Identificador del cliente</dt>
                  <dd>{clientId}</dd>
                </div>

                <div>
                  <dt>Protocolo</dt>
                  <dd>MQTT sobre WebSocket</dd>
                </div>
              </dl>

              {error && status !== 'connected' && (
                <p className="dashboard-broker-error" role="alert">
                  Error de conexión: {error}
                </p>
              )}

              <p className="dashboard-broker-nota">
                La aplicación administra la reconexión automáticamente.
              </p>
            </div>
          )}
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
