import { useState } from 'react'
import EmergencyAlerts from '../EmergencyAlerts'
import EmergencyAcknowledgments from '../EmergencyAcknowledgments'
import EmergencyAlertForm from '../EmergencyAlertForm'
import EmergencyResponseForm from '../EmergencyResponseForm'
import './EmergencyView.css'

export default function EmergencyView({
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
  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null)
  const selectedAlert = activeAlerts.find((item) => item.id === selectedEmergencyId) ?? activeAlerts[0] ?? null

  return (
    <section className="emergency-view" aria-label="Gestión de emergencias">
      <div className="emergency-view-header">
        <div>
          <h2>Emergencias</h2>
          <p>Alertas prioritarias y respuestas con evidencia del personal.</p>
        </div>
        <span className="emergency-view-badge">Canal prioritario</span>
      </div>

      <div className="emergency-view-grid">
        <div className="emergency-view-left">
          <EmergencyAlerts
            activeAlerts={activeAlerts}
            selectedEmergencyId={selectedAlert?.id}
            onSelect={setSelectedEmergencyId}
            connected={connected}
            subscriptionStatus={subscriptionStatus}
            canResolve={canResolve}
            onResolve={onResolve}
          />
          <EmergencyAcknowledgments
            activeAlerts={activeAlerts}
            acknowledgments={acknowledgments}
            user={user}
            connected={connected}
            onConfirm={onConfirm}
            error={acknowledgmentError}
          />
        </div>
        <div className="emergency-view-right">
          <EmergencyResponseForm key={selectedAlert?.id ?? 'none'} alert={selectedAlert} user={user} connected={connected} />
          {canResolve && <EmergencyAlertForm connected={connected} onSend={onSend} />}
        </div>
      </div>
    </section>
  )
}
