import EmergencyAlerts from '../EmergencyAlerts'
import EmergencyAcknowledgments from '../EmergencyAcknowledgments'
import EmergencyAlertForm from '../EmergencyAlertForm'
import './EmergencyView.css'

export default function EmergencyView({
  alerts,
  activeAlerts,
  subscriptionStatus,
  acknowledgments,
  acknowledgmentError,
  user,
  connected,
  canResolve,
  onResolve,
  onConfirm,
  onSend
}) {
  return (
    <section className="emergency-view" aria-label="Gestión de emergencias">
      <div className="emergency-view-header">
        <div>
          <h2>Emergencias</h2>
          <p>Alertas prioritarias y confirmaciones de lectura del edificio.</p>
        </div>

        <span className="emergency-view-badge">Canal prioritario</span>
      </div>

      <div className={`emergency-view-grid ${canResolve ? 'emergency-view-grid--authorized' : ''}`}>
        <div className="emergency-view-left">
          <div className="emergency-view-alerts">
            <EmergencyAlerts
              alerts={alerts}
              activeAlerts={activeAlerts}
              connected={connected}
              subscriptionStatus={subscriptionStatus}
              canResolve={canResolve}
              onResolve={onResolve}
            />
          </div>

          {canResolve && (
            <div className="emergency-view-acknowledgments">
              <EmergencyAcknowledgments
                activeAlerts={activeAlerts}
                acknowledgments={acknowledgments}
                user={user}
                connected={connected}
                onConfirm={onConfirm}
                error={acknowledgmentError}
              />
            </div>
          )}
        </div>

        {canResolve ? (
          <div className="emergency-view-form">
            <EmergencyAlertForm connected={connected} onSend={onSend} />
          </div>
        ) : (
          <div className="emergency-view-acknowledgments">
            <EmergencyAcknowledgments
              activeAlerts={activeAlerts}
              acknowledgments={acknowledgments}
              user={user}
              connected={connected}
              onConfirm={onConfirm}
              error={acknowledgmentError}
            />
          </div>
        )}
      </div>
    </section>
  )
}
