import { useMqtt } from './hooks/useMqtt'
import { useEffect, useState } from 'react'
import UserIdentification from './components/UserIdentification'
import { useIncidentReport } from './hooks/useIncidentReport'
import { useSupportRequest } from './hooks/useSupportRequest'
import { getChannel } from './config/channelOptions'
import { getUserSession, clearUserSession } from './services/userSession'
import {
  getSelectedChannelId,
  saveSelectedChannelId,
  clearSelectedChannelId
} from './services/channelSession'
import './App.css'
import EmergencyNotification from './components/EmergencyNotification'
import { useEmergencyAlert } from './hooks/useEmergencyAlert'
import { canPublishEmergency } from './config/emergencyOptions'
import { useEmergencyAcknowledgments } from './hooks/useEmergencyAcknowledgments'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import MessagingView from './components/messaging/MessagingView'
import EmergencyView from './components/emergency/EmergencyView'
import EmergencyHistory from './components/emergency/EmergencyHistory'
import { clearOwnEmergencyResponses } from './services/emergencyResponseService'
import IncidentView from './components/incidents/IncidentView'
import SupportView from './components/support/SupportView'
import PersonnelView from './components/personnel/PersonnelView'

function MqttDashboard({ user, onLogout }) {
  const [seccionActiva, setSeccionActiva] = useState('mensajeria')
  const [selectedChannelId, setSelectedChannelId] = useState(() => getSelectedChannelId(user.id))
  const confirmationStorageKey =
    `mqtt_hu12_confirmed_${user.role}_${encodeURIComponent(
      user.name.trim().toLowerCase()
    )}`

  const [dismissedEmergencyIds, setDismissedEmergencyIds] = useState(() => {
    try {
      const stored =
        localStorage.getItem(confirmationStorageKey) ??
        sessionStorage.getItem(`mqtt_hu12_dismissed_${user.id}`)

      const parsed = JSON.parse(stored || '[]')

      return Array.isArray(parsed)
        ? parsed.filter((id) => typeof id === 'string')
        : []
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
  const {
        sendEmergency,
        markEmergencyResolved,
      } = useEmergencyAlert(clientRef, user)
  const selectedChannel = getChannel(selectedChannelId)

  function handleSelectChannel(channelId) {
    saveSelectedChannelId(user.id, channelId)
    setSelectedChannelId(channelId)
  }
  useEffect(() => {
    try {
      localStorage.setItem(
        confirmationStorageKey,
        JSON.stringify(dismissedEmergencyIds)
      )
    } catch (error) {
      console.warn(
        'No se pudieron guardar las confirmaciones:',
        error
      )
    }
  }, [confirmationStorageKey, dismissedEmergencyIds])
  const pendingEmergency =
    emergencyAlerts.find((alert) => {
      const isActive = activeEmergencies.some(
        (active) => active.id === alert.id
      )

      const confirmedLocally =
        dismissedEmergencyIds.includes(alert.id)

      const confirmedByMqtt = acknowledgments.some(
        (item) =>
          item.emergencyId === alert.id &&
          item.userRole === user.role &&
          item.userName?.trim().toLowerCase() ===
            user.name.trim().toLowerCase()
      )

      return (
        isActive &&
        !confirmedLocally &&
        !confirmedByMqtt
      )
    }) ?? null
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
              <EmergencyView
                activeAlerts={activeEmergencies}
                subscriptionStatus={emergencySubscriptionStatus}
                acknowledgments={acknowledgments}
                acknowledgmentError={acknowledgmentError}
                user={user}
                connected={status === 'connected'}
                canResolve={canPublishEmergency(user.role)}
                onResolve={markEmergencyResolved}
                onConfirm={handleConfirmRead}
                onSend={sendEmergency}
              />
            )}
            {seccionActiva === 'historial-emergencias' && (
              <EmergencyHistory />
             )}
            {seccionActiva === 'mensajeria' && (
              <MessagingView
                selectedChannelId={selectedChannelId}
                onSelectChannel={handleSelectChannel}
                selectedChannel={selectedChannel}
                receivedMessages={receivedMessages}
                currentUserId={user.id}
                connected={status === 'connected'}
                onSend={sendMessage}
              />
            )}

            {seccionActiva === 'personal' && (
              <PersonnelView
                users={connectedUsers}
                currentUserId={user.id}
                connectionStatus={status}
              />
            )}

            {seccionActiva === 'incidentes' && (
              <IncidentView
                user={user}
                connected={status === 'connected'}
                onSend={sendIncident}
                reports={incidentReports}
              />
            )}

            {seccionActiva === 'soporte' && (
              <SupportView
                user={user}
                connected={status === 'connected'}
                onSend={sendSupportRequest}
                requests={supportRequests}
              />
            )}
            <footer className="pie">No hay historial</footer>
            
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

      clearOwnEmergencyResponses(user.id)
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
