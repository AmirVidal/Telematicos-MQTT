function formatDate(value) {
  if (!value) return 'No registrada'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha inválida' : date.toLocaleString()
}

export default function SupportResolvedList({ resolutions = [], onDownload }) {
  return (
    <section className="tarjeta soporte-resueltos">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">SEGUIMIENTO</p>
          <h2>Casos de soporte resueltos</h2>
        </div>
        <span className="etiqueta-protocolo">{resolutions.length} registrados</span>
      </div>

      {resolutions.length === 0 ? (
        <p className="soporte-lista-vacia">
          Todavía no hay casos de soporte resueltos.
        </p>
      ) : (
        <ul className="soporte-resueltos-lista">
          {resolutions.map((resolution) => (
            <li key={resolution.resolutionId}>
              <details>
                <summary>
                  <strong>{resolution.requesterName}</strong>
                  <span> · {formatDate(resolution.resolvedAt)}</span>
                  <span className="soporte-resueltos-responsable">
                    Resuelto por {resolution.responderName}
                  </span>
                </summary>

                <div className="soporte-resueltos-detalle">
                  <p>
                    <b>Solicitud original:</b> {resolution.requestDescription}
                  </p>
                  <p>
                    <b>Problema encontrado:</b> {resolution.problem}
                  </p>
                  <p>
                    <b>Solución aplicada:</b> {resolution.resolution}
                  </p>

                  <div className="soporte-resueltos-evidencias">
                    <b>Evidencias:</b>
                    {resolution.evidence.map((evidence) => (
                      <button
                        key={evidence.id}
                        type="button"
                        onClick={() => onDownload?.(resolution, evidence)}
                      >
                        Descargar {evidence.filename}
                      </button>
                    ))}
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
