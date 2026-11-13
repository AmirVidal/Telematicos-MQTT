
import { INCIDENT_TYPES } from '../config/incidentOptions'

export default function IncidentReportsList({
  reports = [],
  currentUserId = null
}) {
  const sorted = [...reports].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
  )

  return (
    <section className="tarjeta soporte-lista">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">INCIDENTES</p>
          <h2>Incidentes recibidos</h2>
        </div>

        <span className="etiqueta-protocolo">
          incidentes/reportes
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="soporte-lista-vacia">
          Aún no se han recibido reportes de incidentes.
        </p>
      ) : (
        <ul className="lista-soporte">
          {sorted.map((report) => (
            <li
              key={report.id}
              className={`solicitud-item ${
                report.reporterId === currentUserId
                  ? 'solicitud-item--propio'
                  : ''
              }`}
            >
              <div className="solicitud-cabecera">
                <div>
                  <strong>
                    {INCIDENT_TYPES.find(
                      (item) => item.id === report.incidentType
                    )?.label ?? report.incidentType}
                  </strong>

                  <span className="solicitud-rol">
                    {' · '}{report.location}
                  </span>
                </div>

                <time
                  className="solicitud-fecha"
                  dateTime={report.timestamp}
                >
                  {new Date(report.timestamp).toLocaleString()}
                </time>
              </div>

              <p className="solicitud-descripcion">
                {report.description}
              </p>

              <span className="solicitud-rol">
                Reportado por: {report.reporterName}
                {' · '}{report.reporterRole}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
