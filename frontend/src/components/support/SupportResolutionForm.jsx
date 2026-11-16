import { useState } from 'react'
import {
  MAX_SUPPORT_EVIDENCE_FILES,
  MAX_SUPPORT_EVIDENCE_SIZE,
  MAX_SUPPORT_RESOLUTION_TEXT,
  resolveSupportRequest,
  validateSupportEvidence
} from '../../services/supportService'

export default function SupportResolutionForm({
  request,
  user,
  onClose,
  onResolved
}) {
  const [problem, setProblem] = useState('')
  const [resolution, setResolution] = useState('')
  const [files, setFiles] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  if (!request) return null

  const requestId = request.requestId || request.id

  function handleFiles(event) {
    const selected = Array.from(event.target.files ?? [])

    try {
      validateSupportEvidence(selected)
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

    if (sending) return

    setError('')
    setSending(true)

    try {
      const result = await resolveSupportRequest({
        requestId,
        user,
        problem,
        resolution,
        files
      })
      onResolved?.(result)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="soporte-modal-fondo"
      role="presentation"
      onClick={() => {
        if (!sending) onClose?.()
      }}
    >
      <section
        className="soporte-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="soporte-resolucion-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="soporte-modal-cabecera">
          <div>
            <p className="seccion-etiqueta">EVIDENCIA DE RESOLUCIÓN</p>
            <h2 id="soporte-resolucion-titulo">Marcar soporte como resuelto</h2>
          </div>
          <button
            type="button"
            className="soporte-modal-cerrar"
            onClick={onClose}
            disabled={sending}
            aria-label="Cerrar formulario"
          >
            ×
          </button>
        </header>

        <dl className="soporte-modal-datos">
          <div>
            <dt>Usuario de soporte</dt>
            <dd>
              {user.name} · {user.role}
            </dd>
          </div>
          <div>
            <dt>Solicitante</dt>
            <dd>
              {request.requesterName}
              {request.requesterRole ? ` · ${request.requesterRole}` : ''}
            </dd>
          </div>
          <div>
            <dt>Fecha de resolución</dt>
            <dd>{new Date().toLocaleString()}</dd>
          </div>
          <div>
            <dt>Solicitud original</dt>
            <dd>{request.description}</dd>
          </div>
        </dl>

        <form className="soporte-modal-form" onSubmit={handleSubmit}>
          <label htmlFor="soporte-problema">Problema encontrado</label>
          <textarea
            id="soporte-problema"
            value={problem}
            onChange={(event) => {
              setProblem(event.target.value)
              setError('')
            }}
            maxLength={MAX_SUPPORT_RESOLUTION_TEXT}
            rows={3}
            required
            disabled={sending}
            placeholder="Describe el problema detectado durante la atención..."
          />
          <small>{problem.length}/{MAX_SUPPORT_RESOLUTION_TEXT} caracteres</small>

          <label htmlFor="soporte-solucion">¿Cómo se solucionó?</label>
          <textarea
            id="soporte-solucion"
            value={resolution}
            onChange={(event) => {
              setResolution(event.target.value)
              setError('')
            }}
            maxLength={MAX_SUPPORT_RESOLUTION_TEXT}
            rows={3}
            required
            disabled={sending}
            placeholder="Describe las acciones realizadas para resolver la solicitud..."
          />
          <small>{resolution.length}/{MAX_SUPPORT_RESOLUTION_TEXT} caracteres</small>

          <label htmlFor="soporte-evidencia">Imágenes de evidencia (obligatorio)</label>
          <input
            id="soporte-evidencia"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFiles}
            disabled={sending}
            required={!files.length}
          />
          <small>
            JPG, PNG o WebP · de 1 a {MAX_SUPPORT_EVIDENCE_FILES} imágenes de máximo{' '}
            {MAX_SUPPORT_EVIDENCE_SIZE / 1024 / 1024} MB cada una.
          </small>

          {files.length > 0 ? (
            <ul className="soporte-modal-archivos">
              {files.map((file) => (
                <li key={`${file.name}-${file.lastModified}`}>
                  {file.name} · {(file.size / 1024).toFixed(0)} KB
                </li>
              ))}
            </ul>
          ) : null}

          {error ? (
            <p className="soporte-feedback soporte-feedback--error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="soporte-modal-acciones">
            <button
              type="button"
              className="soporte-boton soporte-boton--secundario"
              onClick={onClose}
              disabled={sending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="soporte-boton soporte-boton--exito"
              disabled={
                sending ||
                !problem.trim() ||
                !resolution.trim() ||
                files.length < 1
              }
            >
              {sending ? 'Guardando evidencia...' : 'Guardar como resuelto'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
