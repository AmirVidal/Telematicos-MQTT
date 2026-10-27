import { useEffect, useRef } from 'react'
import { getEmergencyTypeLabel } from '../config/emergencyOptions'

export default function EmergencyNotification({
  alert,
  onDismiss
}) {
  const buttonRef = useRef(null)
  const alertId = alert?.id

  useEffect(() => {
    if (alertId) {
      buttonRef.current?.focus()
    }
  }, [alertId])

  if (!alert) return null

  const date = new Date(alert.timestamp)

  const formattedDate = Number.isNaN(date.getTime())
    ? alert.timestamp
    : date.toLocaleString()

  return (
    <div className="emergency-overlay">

      <div
        className="emergency-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="emergency-modal-title"
        aria-describedby="emergency-modal-description"
      >

        <div className="emergency-modal-header">

          <span className="emergency-modal-icon">
            ⚠
          </span>

          <div>
            <p className="emergency-modal-label">
              ALERTA PRIORITARIA
            </p>

            <h2 id="emergency-modal-title">
              ¡Mensaje de emergencia!
            </h2>
          </div>

        </div>

        <div className="emergency-modal-body">

          <div className="emergency-modal-detail">
            <strong>Tipo de emergencia</strong>

            <span>
              {getEmergencyTypeLabel(alert.emergencyType)}
            </span>
          </div>

          <div className="emergency-modal-detail">
            <strong>Ubicación</strong>

            <span>{alert.location}</span>
          </div>

          <div className="emergency-modal-description">
            <strong>Descripción</strong>

            <p id="emergency-modal-description">
              {alert.description}
            </p>
          </div>

          <div className="emergency-modal-info">

            <p>
              <strong>Emitido por:</strong>
              {' '}{alert.senderName}
            </p>

            <p>
              <strong>Área:</strong>
              {' '}{alert.senderRole}
            </p>

            <p>
              <strong>Fecha:</strong>
              {' '}{formattedDate}
            </p>

          </div>

        </div>

        <div className="emergency-modal-footer">

          <p>
            Este mensaje permanecerá disponible
            en el historial de emergencias.
          </p>

          <button
            ref={buttonRef}
            type="button"
            className="emergency-dismiss-button"
            onClick={() => onDismiss(alert.id)}
          >
            Entendido — Cerrar aviso
          </button>

        </div>

      </div>
    </div>
  )
}