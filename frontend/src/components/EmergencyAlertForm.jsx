import { useEffect, useRef, useState } from 'react'

import {
  EMERGENCY_TYPES,
  MAX_EMERGENCY_DESCRIPTION_LENGTH,
  MAX_EMERGENCY_LOCATION_LENGTH,
  getEmergencyTypeLabel
} from '../config/emergencyOptions'

import { validateEmergency } from '../services/emergencyPublisher'

export default function EmergencyAlertForm({ connected, onSend }) {

  const [type, setType] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  const [confirmation, setConfirmation] = useState(null)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const cancelButtonRef = useRef(null)

  useEffect(() => {
    if (!confirmation) return

    cancelButtonRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !sending) {
        setConfirmation(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [confirmation, sending])

  function requestConfirmation(event) {
    event.preventDefault()

    if (sending) return

    setFeedback(null)

    try {
      if (!connected) {
        throw new Error('El broker MQTT está desconectado.')
      }

      const validated = validateEmergency({
        type,
        location,
        description
      })

      setConfirmation(validated)

    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message
      })
    }
  }

  async function confirmSend() {
    if (!confirmation || sending) return

    setSending(true)
    setFeedback(null)

    try {
      await onSend(confirmation)

      setType('')
      setLocation('')
      setDescription('')
      setConfirmation(null)

      setFeedback({
        type: 'success',
        message:
          'El broker aceptó la alerta con QoS 1. Esto no confirma que cada persona la haya leído.'
      })

    } catch (error) {
      setConfirmation(null)

      setFeedback({
        type: 'error',
        message: error.message || 'No se pudo publicar la emergencia.'
      })

    } finally {
      setSending(false)
    }
  }

  return (
    <section
      className="tarjeta emergencia-formulario"
      aria-labelledby="titulo-emergencia-formulario"
    >
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta emergencia-etiqueta">
            CANAL PRIORITARIO
          </p>

          <h2 id="titulo-emergencia-formulario">
            Emitir alerta de emergencia
          </h2>
        </div>

        <span className="emergencia-qos">
          QoS 1
        </span>
      </div>

      <p className="emergencia-ayuda">
        Uso exclusivo de personal autorizado.
        La alerta aparecerá en todas las áreas conectadas.
      </p>

      <form onSubmit={requestConfirmation} noValidate>

        <label htmlFor="emergency-type">
          Tipo de emergencia
        </label>

        <select
          id="emergency-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          disabled={sending}
        >
          <option value="">
            Selecciona un tipo
          </option>

          {EMERGENCY_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <label htmlFor="emergency-location">
          Ubicación o zona
        </label>

        <input
          id="emergency-location"
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          maxLength={MAX_EMERGENCY_LOCATION_LENGTH}
          placeholder="Ej. Piso 3, escalera norte"
          disabled={sending}
        />

        <label htmlFor="emergency-description">
          Descripción de la situación
        </label>

        <textarea
          id="emergency-description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_EMERGENCY_DESCRIPTION_LENGTH}
          placeholder="Explica qué sucede y qué precaución debe tomar el personal..."
          disabled={sending}
        />

        <div className="emergencia-pie-formulario">

          <span>
            {description.length}/
            {MAX_EMERGENCY_DESCRIPTION_LENGTH} caracteres
          </span>

          <button
            type="submit"
            className="emergencia-boton"
            disabled={!connected || sending}
          >
            Revisar y confirmar alerta
          </button>

        </div>

        {feedback && (
          <p
            className={`soporte-feedback soporte-feedback--${feedback.type}`}
            role="status"
          >
            {feedback.message}
          </p>
        )}

        {!connected && (
          <p
            className="soporte-feedback soporte-feedback--error"
            role="status"
          >
            Sin conexión MQTT. No es posible emitir alertas.
          </p>
        )}

      </form>

      {confirmation && (

        <div
          className="emergencia-capa"
          role="presentation"
        >
          <div
            className="emergencia-dialogo"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="emergencia-dialogo-titulo"
            aria-describedby="emergencia-dialogo-descripcion"
          >
            <p
              className="emergencia-dialogo-simbolo"
              aria-hidden="true"
            >
              !
            </p>

            <h3 id="emergencia-dialogo-titulo">
              ¿Confirmar envío de emergencia?
            </h3>

            <p id="emergencia-dialogo-descripcion">
              Se publicará una alerta prioritaria para
              el personal conectado.
            </p>

            <dl className="emergencia-resumen">

              <div>
                <dt>Tipo</dt>
                <dd>
                  {getEmergencyTypeLabel(confirmation.type)}
                </dd>
              </div>

              <div>
                <dt>Zona</dt>
                <dd>{confirmation.location}</dd>
              </div>

              <div>
                <dt>Descripción</dt>
                <dd>{confirmation.description}</dd>
              </div>

            </dl>

            <div className="emergencia-acciones">

              <button
                type="button"
                ref={cancelButtonRef}
                className="emergencia-cancelar"
                onClick={() => setConfirmation(null)}
                disabled={sending}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="emergencia-boton"
                onClick={confirmSend}
                disabled={sending || !connected}
              >
                {sending
                  ? 'Publicando...'
                  : 'Sí, emitir alerta'}
              </button>

            </div>

          </div>
        </div>

      )}

    </section>
  )
}