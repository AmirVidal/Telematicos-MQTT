import { useEffect, useState } from 'react'

import {
  ASSIGNABLE_EMERGENCY_ROLES
} from '../../config/emergencyOptions'

export default function EmergencyRoleAssignment({
  alert,
  connected,
  onAssign
}) {
  const [selectedRole, setSelectedRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    setSelectedRole(alert?.assignedRole || '')
    setFeedback(null)
  }, [alert?.id, alert?.assignedRole])

  async function handleAssign(event) {
    event.preventDefault()

    if (!alert || !connected || saving || !selectedRole) {
      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      await onAssign(alert, selectedRole)

      setFeedback({
        type: 'success',
        message:
          'Asignación publicada mediante MQTT. ' +
          'El personal responsable recibirá la actualización.'
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'No se pudo asignar la emergencia.'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!alert) {
    return null
  }

  return (
    <section
      className="tarjeta hu14-panel"
      aria-label="Asignación de emergencia"
    >
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">
            ASIGNACIÓN DE RESPONSABLE
          </p>

          <h2>Asignar rol responsable</h2>
        </div>
      </div>

      <div className="hu14-context">
        <strong>Emergencia seleccionada</strong>

        <p>
          <b>Ubicación:</b> {alert.location}
        </p>

        <p>
          <b>Responsable actual:</b>{' '}
          {ASSIGNABLE_EMERGENCY_ROLES.find(
            (role) => role.value === alert.assignedRole
          )?.label || 'Sin asignar'}
        </p>
      </div>

      <form className="hu14-form" onSubmit={handleAssign}>
        <label htmlFor="emergency-assigned-role">
          Seleccionar área responsable
        </label>

        <select
          id="emergency-assigned-role"
          value={selectedRole}
          onChange={(event) => {
            setSelectedRole(event.target.value)
            setFeedback(null)
          }}
          disabled={saving || !connected}
          required
        >
          <option value="">
            Selecciona un rol
          </option>

          {ASSIGNABLE_EMERGENCY_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="hu14-submit"
          disabled={
            saving ||
            !connected ||
            !selectedRole ||
            selectedRole === alert.assignedRole
          }
        >
          {saving
            ? 'Asignando responsable...'
            : alert.assignedRole
              ? 'Cambiar rol responsable'
              : 'Asignar emergencia'}
        </button>
      </form>

      {feedback && (
        <p
          className={
            feedback.type === 'error'
              ? 'hu14-error'
              : 'hu14-success'
          }
          role="status"
        >
          {feedback.message}
        </p>
      )}
    </section>
  )
}