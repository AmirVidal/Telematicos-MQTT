import { useState } from 'react'
import { USER_ROLES, createUserSession } from '../services/userSession'

const ROLE_OPTIONS = [
  { value: USER_ROLES.SEGURIDAD, label: 'Seguridad' },
  { value: USER_ROLES.MANTENIMIENTO, label: 'Mantenimiento' },
  { value: USER_ROLES.RECEPCION, label: 'Recepción' },
  { value: USER_ROLES.LIMPIEZA, label: 'Limpieza' },
  { value: USER_ROLES.ADMINISTRACION, label: 'Administración' }
]

export default function UserIdentification({ onIdentify }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()

    if (submitting) return

    setError('')
    setSubmitting(true)

    try {
      const user = createUserSession(name, role)
      onIdentify(user)
    } catch (err) {
      setError(err.message || 'No se pudo registrar la identificación.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="identification-page">
      <section className="identification-card">
        <div className="identification-header">
          <h1>Sistema de Mensajería MQTT</h1>
          <p>Identificación del personal del edificio</p>
        </div>

        <form onSubmit={handleSubmit} className="identification-form">
          <div className="form-group">
            <label htmlFor="user-name">Nombre completo</label>

            <input
              id="user-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
              placeholder="Ingrese su nombre completo"
              maxLength={50}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-role">Tipo de personal</label>

            <select
              id="user-role"
              value={role}
              onChange={(event) => {
                setRole(event.target.value)
                setError('')
              }}
              required
            >
              <option value="">Seleccione su área de trabajo</option>

              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="identification-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="identification-button" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Ingresar al sistema'}
          </button>
        </form>

        <p className="identification-footer">Plataforma de comunicación del personal operativo</p>
      </section>
    </main>
  )
}
