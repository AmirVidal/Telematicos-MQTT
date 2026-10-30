import SupportRequestForm from '../SupportRequestForm'
import SupportRequestsList from '../SupportRequestsList'
import './SupportView.css'

export default function SupportView({ user, connected, onSend, requests }) {
  const canViewRequests = user.role === 'mantenimiento' || user.role === 'administracion'

  return (
    <section className="support-view" aria-label="Solicitudes de soporte">
      <div className="support-view-header">
        <h2>Soporte</h2>
        <p>
          Envía solicitudes de asistencia y consulta las solicitudes recibidas según los permisos de
          tu área.
        </p>
      </div>

      <div className={`support-view-grid ${!canViewRequests ? 'support-view-grid--single' : ''}`}>
        <div className="support-view-form">
          <SupportRequestForm connected={connected} onSend={onSend} />
        </div>

        {canViewRequests && (
          <div className="support-view-list">
            <SupportRequestsList requests={requests} currentUserId={user.id} />
          </div>
        )}
      </div>
    </section>
  )
}
