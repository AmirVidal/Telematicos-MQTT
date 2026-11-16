import { useState } from 'react'
import { authenticateUser } from '../services/userSession'

export default function UserIdentification({ onIdentify }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()

    if (submitting) return

    setError('')
    setSubmitting(true)

    try {
      const user = authenticateUser(username, password)
      onIdentify(user)
    } catch (err) {
      setError(err.message || 'No se pudo registrar la identificacion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="identification-page">
      <section className="identification-card">
        <div className="identification-header">
          <h1>Sistema de Mensajeria MQTT</h1>
          <p>Identificacion del personal del edificio</p>
        </div>

        <form onSubmit={handleSubmit} className="identification-form">
          <div className="form-group">
            <label htmlFor="user-username">Usuario</label>

            <input
              id="user-username"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                setError('')
              }}
              placeholder="Ingrese su usuario"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-password">Contrasena</label>

            <input
              id="user-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              autoComplete="current-password"
              required
            />
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

        <p className="identification-footer">Plataforma de comunicacion del personal operativo</p>
      </section>
    </main>
  )
}
