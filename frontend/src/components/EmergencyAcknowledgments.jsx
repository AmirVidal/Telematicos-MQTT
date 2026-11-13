import { useState } from 'react'

import {
  canPublishEmergency,
  getEmergencyTypeLabel
} from '../config/emergencyOptions'

function formatDate(value) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString()
}

export default function EmergencyAcknowledgments({
  activeAlerts = [],
  acknowledgments = [],
  user,
  connected,
  onConfirm,
  error = ''
}) {
  const [confirmingId, setConfirmingId] = useState(null)
  const [confirmationError, setConfirmationError] = useState('')

  const canViewAll = canPublishEmergency(user?.role)

  async function handleConfirm(alertId) {
    if (!connected || confirmingId) return

    setConfirmingId(alertId)
    setConfirmationError('')

    try {
      await onConfirm(alertId)
    } catch (error) {
      setConfirmationError(
        error.message || 'No se pudo confirmar la lectura.'
      )
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <section className="tarjeta hu13-panel">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">
            CONFIRMACIÓN DE EMERGENCIAS
          </p>

          <h2>Confirmaciones de lectura</h2>
        </div>

        <span className="etiqueta-protocolo">
          QoS 1
        </span>
      </div>

      <p>
        Confirma que has leído las alertas activas.
        La confirmación se enviará mediante MQTT.
      </p>

      {!connected && (
        <p className="hu13-error">
          Sin conexión MQTT. No se pueden enviar confirmaciones.
        </p>
      )}

      {error && (
        <p className="hu13-error" role="alert">
          {error}
        </p>
      )}

      {confirmationError && (
        <p className="hu13-error" role="alert">
          {confirmationError}
        </p>
      )}

      {activeAlerts.length === 0 ? (
        <p className="hu13-empty">
          No existen emergencias activas para confirmar.
        </p>
      ) : (
        <div className="hu13-list">
          {activeAlerts.map((alert) => {
            const confirmations = acknowledgments.filter(
              (item) => item.emergencyId === alert.id
            )

            const ownConfirmation = confirmations.find(
              (item) => item.userId === user.id
            )

            return (
              <div className="hu13-item" key={alert.id}>
                <div className="hu13-item-header">
                  <div>
                    <strong>
                      {getEmergencyTypeLabel(alert.emergencyType)}
                    </strong>

                    <p>Ubicación: {alert.location}</p>
                  </div>

                  <span className="hu13-count">
                    {confirmations.length} confirmación(es)
                  </span>
                </div>

                <button
                  type="button"
                  className="hu13-confirm-button"
                  onClick={() => handleConfirm(alert.id)}
                  disabled={
                    !connected ||
                    Boolean(confirmingId) ||
                    Boolean(ownConfirmation)
                  }
                >
                  {ownConfirmation
                    ? 'Lectura confirmada'
                    : confirmingId === alert.id
                      ? 'Confirmando...'
                      : 'Confirmar lectura'}
                </button>

                {ownConfirmation && (
                  <p className="hu13-success">
                    Confirmaste esta emergencia el{' '}
                    {formatDate(ownConfirmation.confirmedAt)}.
                  </p>
                )}

                {canViewAll && (
                  <div className="hu13-details">
                    <h3>Personal que confirmó</h3>

                    {confirmations.length === 0 ? (
                      <p>Aún no existen confirmaciones.</p>
                    ) : (
                      <ul>
                        {confirmations.map((item) => (
                          <li
                            key={`${item.emergencyId}-${item.userId}`}
                          >
                            <strong>{item.userName}</strong>
                            {' · '}
                            {item.userRole}
                            {' · '}
                            {formatDate(item.confirmedAt)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}