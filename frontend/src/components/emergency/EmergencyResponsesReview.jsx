
import { useEffect, useState } from 'react'

import { canPublishEmergency } from '../../config/emergencyOptions'

import {
  loadEmergencyResponsesForReview,
  loadEmergencyEvidenceForReview
} from '../../services/emergencyReviewService'

import './EmergencyResponsesReview.css'

function formatDate(value) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Fecha desconocida'
    : date.toLocaleString('es-BO')
}

export default function EmergencyResponsesReview({
  alert,
  user
}) {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingFileId, setLoadingFileId] = useState(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const canReview = canPublishEmergency(user?.role)

  // Cargar automáticamente las respuestas de la emergencia seleccionada.
  useEffect(() => {
    let cancelled = false

    setResponses([])
    setError('')
    setPreview(null)

    if (!canReview || !alert?.id) {
      setLoading(false)

      return () => {
        cancelled = true
      }
    }

    setLoading(true)

    loadEmergencyResponsesForReview({
      emergencyId: alert.id
    })
      .then((data) => {
        if (!cancelled) {
          setResponses(data)
        }
      })
      .catch((failure) => {
        if (!cancelled) {
          setError(
            failure.message ||
              'No se pudieron consultar las respuestas.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [alert?.id, canReview, refreshIndex])

  // Liberar las imágenes abiertas anteriormente.
  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url)
      }
    }
  }, [preview])

  async function handleEvidence(evidence, action) {
    if (!alert?.id) return

    setLoadingFileId(evidence.id)
    setError('')

    try {
      const blob = await loadEmergencyEvidenceForReview({
        emergencyId: alert.id,
        fileId: evidence.id
      })

      const objectUrl = URL.createObjectURL(blob)

      if (
        action === 'preview' &&
        evidence.mimeType.startsWith('image/')
      ) {
        setPreview({
          url: objectUrl,
          filename: evidence.filename
        })
      } else {
        const link = document.createElement('a')

        link.href = objectUrl
        link.download = evidence.filename

        document.body.appendChild(link)
        link.click()
        link.remove()

        setTimeout(() => {
          URL.revokeObjectURL(objectUrl)
        }, 2000)
      }
    } catch (failure) {
      setError(
        failure.message || 'No se pudo obtener la evidencia.'
      )
    } finally {
      setLoadingFileId(null)
    }
  }

  // Solo Seguridad y Administración ven este componente.
  if (!canReview) {
    return null
  }

  return (
    <section className="tarjeta erp-panel">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">
            SEGUIMIENTO DE ATENCIÓN
          </p>

          <h2>Respuestas del personal</h2>
        </div>
      </div>

      {!alert ? (
        <p className="erp-empty">
          Selecciona una emergencia activa para consultar
          sus respuestas.
        </p>
      ) : (
        <>
          <div className="erp-emergency">
            <strong>{alert.emergencyType}</strong>

            <p>
              <b>Ubicación:</b> {alert.location}
            </p>

            <p>
              <b>Rol responsable:</b>{' '}
              {alert.assignedRole || 'Sin asignar'}
            </p>
          </div>

          <div className="erp-toolbar">
            <strong>
              Respuestas registradas ({responses.length})
            </strong>

            <button
              type="button"
              onClick={() => {
                setRefreshIndex((value) => value + 1)
              }}
              disabled={loading}
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>

          {loading && responses.length === 0 ? (
            <p className="erp-empty">
              Cargando respuestas...
            </p>
          ) : responses.length === 0 ? (
            <p className="erp-empty">
              Todavía no se registraron respuestas
              para esta emergencia.
            </p>
          ) : (
            <div className="erp-list">
              {responses.map((response) => (
                <article
                  className="erp-response"
                  key={response.responseId}
                >
                  <div className="erp-response-header">
                    <strong>
                      {response.responderName}
                    </strong>

                    <span>
                      {response.responderRole}
                    </span>
                  </div>

                  <small>
                    {formatDate(response.createdAt)}
                  </small>

                  <p className="erp-label">
                    Descripción de la atención
                  </p>

                  <p className="erp-description">
                    {response.description}
                  </p>

                  <p className="erp-label">
                    Evidencias adjuntas
                  </p>

                  <div className="erp-evidence-list">
                    {response.evidence.map((evidence) => (
                      <div
                        className="erp-evidence"
                        key={evidence.id}
                      >
                        <span title={evidence.filename}>
                          {evidence.filename}
                        </span>

                        <div className="erp-evidence-actions">
                          {evidence.mimeType.startsWith('image/') && (
                            <button
                              type="button"
                              disabled={
                                loadingFileId === evidence.id
                              }
                              onClick={() =>
                                handleEvidence(
                                  evidence,
                                  'preview'
                                )
                              }
                            >
                              Ver
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={
                              loadingFileId === evidence.id
                            }
                            onClick={() =>
                              handleEvidence(
                                evidence,
                                'download'
                              )
                            }
                          >
                            Descargar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {preview && (
        <div className="erp-preview">
          <div className="erp-preview-header">
            <strong>{preview.filename}</strong>

            <button
              type="button"
              onClick={() => setPreview(null)}
            >
              Cerrar
            </button>
          </div>

          <img
            src={preview.url}
            alt={`Evidencia: ${preview.filename}`}
          />
        </div>
      )}

      {error && (
        <p className="erp-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}