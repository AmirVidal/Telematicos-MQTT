import IncidentReportForm from '../IncidentReportForm'
import IncidentReportsList from '../IncidentReportsList'
import './IncidentView.css'

export default function IncidentView({ user, connected, onSend, reports }) {
  const canViewReports = user.role === 'seguridad' || user.role === 'administracion'

  return (
    <section className="incident-view" aria-label="Gestión de incidentes">
      <div className="incident-view-header">
        <h2>Incidentes</h2>
        <p>
          Registra incidentes del edificio y consulta los reportes según los permisos de tu área.
        </p>
      </div>

      <div className={`incident-view-grid ${!canViewReports ? 'incident-view-grid--single' : ''}`}>
        <div className="incident-view-form">
          <IncidentReportForm connected={connected} onSend={onSend} />
        </div>

        {canViewReports && (
          <div className="incident-view-list">
            <IncidentReportsList reports={reports} currentUserId={user.id} />
          </div>
        )}
      </div>
    </section>
  )
}
