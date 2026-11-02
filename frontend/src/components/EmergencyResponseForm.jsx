import { useEffect, useState } from 'react'
import { getEmergencyTypeLabel } from '../config/emergencyOptions'
import {
  downloadOwnEvidence,
  loadOwnEmergencyResponse,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_SIZE,
  sendEmergencyResponse,
  validateEvidence
} from '../services/emergencyResponseService'

export default function EmergencyResponseForm({ alert, user, connected }) {
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [ownResponse, setOwnResponse] = useState(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setDescription('')
    setFiles([])
    setOwnResponse(null)
    setError('')
    if (!alert?.id || !user?.id) return () => { active = false }
    setLoading(true)
    loadOwnEmergencyResponse({ emergencyId: alert.id, userId: user.id })
      .then((response) => {
        if (active) setOwnResponse(response)
      })
      .catch((failure) => {
        if (active) setError(failure.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [alert?.id, user?.id])

  function selectFiles(event) {
    const selected = Array.from(event.target.files ?? [])
    try {
      validateEvidence(selected)
      setFiles(selected)
      setError('')
    } catch (failure) {
      setFiles([])
      setError(failure.message)
      event.target.value = ''
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!alert || sending || !connected) return
    setError('')
    setSending(true)
    try {
      const response = await sendEmergencyResponse({
        emergencyId: alert.id,
        user,
        description,
        files
      })
      setOwnResponse(response)
      setDescription('')
      setFiles([])
      const input = event.currentTarget?.querySelector('input[type="file"]')
      if (input) input.value = ''
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDownload(evidence) {
    try {
      await downloadOwnEvidence({ emergencyId: alert.id, userId: user.id, evidence })
      setError('')
    } catch (failure) {
      setError(failure.message)
    }
  }

  return (
    <section className="tarjeta hu14-panel" aria-labelledby="hu14-title">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">HU14 · Gestión de atención</p>
          <h2 id="hu14-title">Responder emergencia</h2>
        </div>
      </div>

      {!alert ? (
        <p className="hu14-empty">Selecciona una emergencia activa para responder.</p>
      ) : (
        <>
          <div className="hu14-context">
            <strong>{getEmergencyTypeLabel(alert.emergencyType)}</strong>
            <p><b>Ubicación:</b> {alert.location}</p>
            <p>{alert.description}</p>
            <small>Reportada por {alert.senderName} ({alert.senderRole})</small>
          </div>

          <form className="hu14-form" onSubmit={handleSubmit}>
            <label htmlFor="hu14-description">Descripción de la atención realizada</label>
            <textarea
              id="hu14-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={4}
              required
              placeholder="Describe cómo atendiste la emergencia..."
            />
            <small className="hu14-counter">{description.length}/500 caracteres</small>

            <label htmlFor="hu14-evidence">Adjuntar evidencia (obligatoria)</label>
            <input
              id="hu14-evidence"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={selectFiles}
              required={!files.length}
            />
            <small>JPG, PNG, WebP o PDF · máximo {MAX_EVIDENCE_FILES} archivos de {MAX_EVIDENCE_SIZE / 1024 / 1024} MB cada uno.</small>
            {files.length > 0 && (
              <ul className="hu14-files">
                {files.map((file) => <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>)}
              </ul>
            )}
            <button type="submit" className="hu14-submit" disabled={sending || !connected || loading || !files.length || !description.trim()}>
              {sending ? 'Enviando respuesta...' : 'Enviar respuesta con evidencia'}
            </button>
          </form>

          {error && <p className="hu14-error" role="alert">{error}</p>}
          {loading && <p className="hu14-empty">Cargando tu respuesta guardada...</p>}

          {ownResponse && (
            <div className="hu14-success" role="status">
              <strong>Respuesta registrada</strong>
              <p><b>{ownResponse.responderName}</b> · {ownResponse.responderRole}</p>
              <p>{new Date(ownResponse.createdAt).toLocaleString('es-BO')}</p>
              <p>{ownResponse.description}</p>
              <div className="hu14-evidence-list">
                {ownResponse.evidence.map((evidence) => (
                  <button key={evidence.id} type="button" onClick={() => handleDownload(evidence)}>
                    Descargar: {evidence.filename}
                  </button>
                ))}
              </div>
              <small>Solo se muestra tu última respuesta enviada a esta emergencia en esta sesión.</small>
            </div>
          )}
        </>
      )}
    </section>
  )
}
