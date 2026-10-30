import { useMqtt } from './hooks/useMqtt'
import { useEffect, useState } from 'react'
import UserIdentification from './components/UserIdentification'
import ChannelSelector from './components/ChannelSelector'
import ConnectedUsers from './components/ConnectedUsers'
import MessageComposer from './components/MessageComposer'
import ReceivedMessages from './components/ReceivedMessages'
import SupportRequestForm from './components/SupportRequestForm'
import IncidentReportForm from './components/IncidentReportForm'
import IncidentReportsList from './components/IncidentReportsList'
import { useIncidentReport } from './hooks/useIncidentReport'
import SupportRequestsList from './components/SupportRequestsList'
import { useSupportRequest } from './hooks/useSupportRequest'
import { getChannel } from './config/channelOptions'
import { getUserSession, clearUserSession } from './services/userSession'
import {
  getSelectedChannelId,
  saveSelectedChannelId,
  clearSelectedChannelId
} from './services/channelSession'
import './App.css'
import EmergencyAlertForm from './components/EmergencyAlertForm'
import EmergencyAlerts from './components/EmergencyAlerts'
import EmergencyNotification from './components/EmergencyNotification'
import { useEmergencyAlert } from './hooks/useEmergencyAlert'
import { canPublishEmergency } from './config/emergencyOptions'
import { useEmergencyAcknowledgments } from './hooks/useEmergencyAcknowledgments'
import EmergencyAcknowledgments from './components/EmergencyAcknowledgments'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'

const estados = {
  connecting: {
    titulo: 'Conectando',
    descripcion: 'Estableciendo conexión con el broker MQTT.'
  },
  connected: {
    titulo: 'Conectado',
    descripcion: 'La conexión con el broker MQTT está activa.'
  },
  reconnecting: {
    titulo: 'Reconectando',
    descripcion: 'Intentando restablecer la conexión automáticamente.'
  },
  disconnected: {
    titulo: 'Desconectado',
    descripcion: 'La conexión se interrumpió. Se intentará recuperar.'
  }
}

function MqttDashboard({ user, onLogout }) {
  const [seccionActiva, setSeccionActiva] = useState('mensajeria')
  const [selectedChannelId, setSelectedChannelId] = useState(() => getSelectedChannelId(user.id))
  const [dismissedEmergencyIds, setDismissedEmergencyIds] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`mqtt_hu12_dismissed_${user.id}`)

      if (!stored) return []

      const parsed = JSON.parse(stored)

      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
    } catch {
      return []
    }
  })

  const {
    url,
    clientId,
    status,
    error,
    connectedUsers,
    sendMessage,
    receivedMessages,
    supportRequests,
    emergencyAlerts,
    activeEmergencies,
    emergencySubscriptionStatus,
    incidentReports,
    clientRef
  } = useMqtt(user, undefined, selectedChannelId)
  const { acknowledgments, acknowledgmentError, confirmRead } = useEmergencyAcknowledgments(
    clientRef,
    status
  )

  async function handleConfirmRead(alertId) {
    return confirmRead({
      alertId,
      user,
      clientId
    })
  }
  const { sendSupportRequest } = useSupportRequest(clientRef, user)
  const { sendIncident } = useIncidentReport(clientRef, user)
  const { sendEmergency, markEmergencyResolved } = useEmergencyAlert(clientRef, user)
  const selectedChannel = getChannel(selectedChannelId)

  function handleSelectChannel(channelId) {
    saveSelectedChannelId(user.id, channelId)
    setSelectedChannelId(channelId)
  }
  useEffect(() => {
    sessionStorage.setItem(`mqtt_hu12_dismissed_${user.id}`, JSON.stringify(dismissedEmergencyIds))
  }, [user.id, dismissedEmergencyIds])
  const pendingEmergency =
    emergencyAlerts.find(
      (alert) =>
        activeEmergencies.some((active) => active.id === alert.id) &&
        !dismissedEmergencyIds.includes(alert.id)
    ) ?? null
  function handleDismissEmergency(alertId) {
    setDismissedEmergencyIds((previous) => {
      if (previous.includes(alertId)) {
        return previous
      }

      return [...previous, alertId].slice(-100)
    })
  }

  return (
    <main className="pagina">
      <EmergencyNotification
        alert={pendingEmergency}
        onDismiss={handleDismissEmergency}
        connected={status === 'connected'}
        confirmed={acknowledgments.some(
          (item) => item.emergencyId === pendingEmergency?.id && item.userId === user.id
        )}
        onConfirm={async (alertId) => {
          await handleConfirmRead(alertId)
          handleDismissEmergency(alertId)
        }}
      />

      <Header
        user={user}
        status={status}
        url={url}
        clientId={clientId}
        error={error}
        onLogout={onLogout}
      />
      <div className="dashboard-estructura">
        <Sidebar seccionActiva={seccionActiva} onCambiarSeccion={setSeccionActiva} />

        <div className="dashboard-contenido">
          <div className="contenedor">
            {seccionActiva === 'emergencias' && (
              <>
                <EmergencyAlerts
                  alerts={emergencyAlerts}
                  activeAlerts={activeEmergencies}
                  connected={status === 'connected'}
                  subscriptionStatus={emergencySubscriptionStatus}
                  canResolve={canPublishEmergency(user.role)}
                  onResolve={markEmergencyResolved}
                />

                <EmergencyAcknowledgments
                  activeAlerts={activeEmergencies}
                  acknowledgments={acknowledgments}
                  user={user}
                  connected={status === 'connected'}
                  onConfirm={handleConfirmRead}
                  error={acknowledgmentError}
                />

                {canPublishEmergency(user.role) && (
                  <EmergencyAlertForm connected={status === 'connected'} onSend={sendEmergency} />
                )}
              </>
            )}

            {seccionActiva === 'mensajeria' && (
              <>
                <ChannelSelector
                  selectedChannelId={selectedChannelId}
                  onSelectChannel={handleSelectChannel}
                />

                <ReceivedMessages
                  messages={receivedMessages}
                  currentUserId={user.id}
                  channelName={selectedChannel?.name ?? null}
                />

                <MessageComposer
                  channelId={selectedChannelId}
                  channelName={selectedChannel?.name ?? 'Sin seleccionar'}
                  connected={status === 'connected'}
                  onSend={sendMessage}
                />
              </>
            )}

            {seccionActiva === 'personal' && (
              <ConnectedUsers
                users={connectedUsers}
                currentUserId={user.id}
                connectionStatus={status}
              />
            )}

            {seccionActiva === 'incidentes' && (
              <>
                <IncidentReportForm connected={status === 'connected'} onSend={sendIncident} />

                {(user.role === 'seguridad' || user.role === 'administracion') && (
                  <IncidentReportsList reports={incidentReports} currentUserId={user.id} />
                )}
              </>
            )}

            {seccionActiva === 'soporte' && (
              <>
                <SupportRequestForm
                  connected={status === 'connected'}
                  onSend={sendSupportRequest}
                />

                {(user.role === 'mantenimiento' || user.role === 'administracion') && (
                  <SupportRequestsList requests={supportRequests} currentUserId={user.id} />
                )}
              </>
            )}
            <footer className="pie">Servicios Telemáticos · Grupo 6</footer>
          </div>
        </div>
      </div>
    </main>
  )
}

function App() {
  const [user, setUser] = useState(getUserSession)

  function handleIdentify(identifiedUser) {
    setUser(identifiedUser)
  }

  function handleLogout() {
    if (user?.id) {
      sessionStorage.removeItem(`mqtt_hu12_alerts_${user.id}`)

      sessionStorage.removeItem(`mqtt_hu12_dismissed_${user.id}`)
    }

    clearUserSession()
    clearSelectedChannelId()

    setUser(null)
  }

  if (!user) {
    return <UserIdentification onIdentify={handleIdentify} />
  }

  return <MqttDashboard user={user} onLogout={handleLogout} />
}

export default App
