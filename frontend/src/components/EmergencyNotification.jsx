import { useEffect, useRef, useState } from 'react'
import { getEmergencyTypeLabel } from '../config/emergencyOptions'

export default function EmergencyNotification({
  alert,
  onDismiss,
  onConfirm,
  connected = false,
  confirmed = false
}) {
  const buttonRef = useRef(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmationError, setConfirmationError] = useState('')

  const alertId = alert?.id

  useEffect(() => {
    if (alertId) {
      buttonRef.current?.focus()
    }

    setConfirmationError('')
  }, [alertId])

  async function handleConfirm() {
    if (
      !alertId ||
      !onConfirm ||
      !connected ||
      confirming ||
      confirmed
    ) {
      return
    }

    setConfirming(true)
    setConfirmationError('')

    try {
      await onConfirm(alertId)
    } catch (error) {
      setConfirmationError(
        error.message || 'No se pudo confirmar la lectura.'
      )
    } finally {
      setConfirming(false)
    }
  }

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
              <strong>Emitido por:</strong>{' '}
              {alert.senderName}
            </p>

            <p>
              <strong>Área:</strong>{' '}
              {alert.senderRole}
            </p>

            <p>
              <strong>Fecha:</strong>{' '}
              {formattedDate}
            </p>
          </div>
        </div>

        <div className="emergency-modal-footer">
          <p>
            Puedes confirmar que leíste la emergencia
            o cerrar el aviso sin confirmar.
          </p>

          {confirmationError && (
            <p className="hu13-error" role="alert">
              {confirmationError}
            </p>
          )}

          <div className="hu13-modal-actions">
            <button
              ref={buttonRef}
              type="button"
              className="emergency-dismiss-button"
              onClick={() => onDismiss(alert.id)}
              disabled={confirming}
            >
              Cerrar aviso
            </button>

            <button
              type="button"
              className="hu13-confirm-button"
              onClick={handleConfirm}
              disabled={
                !connected ||
                confirming ||
                confirmed
              }
            >
              {confirmed
                ? 'Lectura confirmada'
                : confirming
                  ? 'Confirmando...'
                  : 'Confirmar lectura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}