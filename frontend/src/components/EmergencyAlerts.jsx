import { useState } from 'react'
import { getEmergencyTypeLabel } from '../config/emergencyOptions'

function displayDate(isoDate) {
  const date = new Date(isoDate)
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleString('es-BO')
}

export default function EmergencyAlerts({
  activeAlerts = [],
  selectedEmergencyId,
  onSelect,
  connected,
  subscriptionStatus,
  canResolve = false,
  onResolve
}) {
  const [resolvingId, setResolvingId] = useState(null)
  const [resolutionError, setResolutionError] = useState('')

  async function handleResolve(alert) {
    if (!canResolve || !onResolve || resolvingId) return
    if (!window.confirm(`¿Confirmas que la emergencia en ${alert.location} ya fue resuelta?`)) return
    setResolvingId(alert.id)
    setResolutionError('')
    try {
      await onResolve(alert.id)
    } catch (error) {
      setResolutionError(error.message || 'No se pudo resolver la emergencia.')
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <section className="tarjeta emergencias-panel" aria-labelledby="emergencias-titulo">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta emergencia-etiqueta">ALERTAS PRIORITARIAS</p>
          <h2 id="emergencias-titulo">Emergencias del edificio</h2>
        </div>
        <span className="emergencia-canal">Canal general</span>
      </div>
      <p className="emergencia-estado-suscripcion">
        {connected && subscriptionStatus === 'active'
          ? 'Escuchando alertas de todas las áreas en tiempo real.'
          : connected && subscriptionStatus === 'failed'
            ? 'No se logró activar la suscripción de emergencias.'
            : connected
              ? 'Activando el canal prioritario...'
              : 'Sin conexión con el canal de emergencias.'}
      </p>
      <div className="emergencias-activas-contenedor">
        <h3>Emergencias activas ({activeAlerts.length})</h3>
        {!connected || subscriptionStatus !== 'active' ? (
          <p className="emergencia-sin-alertas">No se puede comprobar el estado de las emergencias sin la suscripción MQTT activa.</p>
        ) : activeAlerts.length === 0 ? (
          <p className="emergencia-sin-alertas">No hay emergencias activas registradas en el broker.</p>
        ) : (
          <ul className="emergencias-lista" aria-live="polite">
            {activeAlerts.map((alert) => (
              <li className={`emergencia-recibida ${selectedEmergencyId === alert.id ? 'hu14-selected-alert' : ''}`} key={alert.id}>
                <div className="emergencia-recibida-cabecera">
                  <strong>ACTIVA · {getEmergencyTypeLabel(alert.emergencyType)}</strong>
                  <time dateTime={alert.timestamp}>{displayDate(alert.timestamp)}</time>
                </div>
                <p><strong>Ubicación:</strong> {alert.location}</p>
                <p>{alert.description}</p>
                <p className="emergencia-emisor">Emitida por {alert.senderName} ({alert.senderRole})</p>
                <p>
                  <strong>Rol responsable:</strong>{' '}
                  {alert.assignedRole
                    ? alert.assignedRole
                    : 'Pendiente de asignación'}
                </p>
                <div className="hu14-alert-actions">
                  <button type="button" className="hu14-select" onClick={() => onSelect(alert.id)}>
                    {selectedEmergencyId === alert.id ? 'Seleccionada para responder' : 'Responder emergencia'}
                  </button>
                  {canResolve && (
                    <button
                      type="button"
                      className="emergencia-resolver"
                      onClick={() => handleResolve(alert)}
                      disabled={Boolean(resolvingId) || !connected}
                    >
                      {resolvingId === alert.id ? 'Resolviendo...' : 'Marcar como resuelta'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {resolutionError && <p className="soporte-feedback soporte-feedback--error" role="alert">{resolutionError}</p>}
      </div>
    </section>
  )
}
