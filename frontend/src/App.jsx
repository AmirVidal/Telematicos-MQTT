import { useMqtt } from './hooks/useMqtt'
import { useState } from 'react'
import UserIdentification from './components/UserIdentification'
import ChannelSelector from './components/ChannelSelector'
import ConnectedUsers from './components/ConnectedUsers'
import MessageComposer from './components/MessageComposer'
import ReceivedMessages from './components/ReceivedMessages'
import SupportRequestForm from './components/SupportRequestForm'
import { useSupportRequest } from './hooks/useSupportRequest'
import { getChannel } from './config/channelOptions'
import { getUserSession, clearUserSession } from './services/userSession'
import { getSelectedChannelId, saveSelectedChannelId, clearSelectedChannelId } from './services/channelSession'
import './App.css'

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
  const [selectedChannelId, setSelectedChannelId] = useState(() =>
    getSelectedChannelId(user.id)
  )

  const {
    url,
    clientId,
    status,
    error,
    connectedUsers,
    sendMessage,
    receivedMessages,
    subscribedChannelId,
    clientRef
  } = useMqtt(user, undefined, selectedChannelId)

  const { sendSupportRequest } = useSupportRequest(clientRef, user)

  const selectedChannel = getChannel(selectedChannelId)

  function handleSelectChannel(channelId) {
    saveSelectedChannelId(user.id, channelId)
    setSelectedChannelId(channelId)
  }
  const estado = estados[status] ?? estados.disconnected

  return (
    <main className="pagina">
      <div className="contenedor">
        <header className="cabecera">
          <div className="logo" aria-hidden="true">
            MQ
          </div>
          <div>
            <p className="subtitulo-superior">Servicios Telemáticos</p>
            <h1>Sistema de mensajería MQTT</h1>
            <p className="subtitulo">Comunicación del personal operativo del edificio</p>
          </div>
        </header>

        <section className="tarjeta perfil-usuario">
          <div className="tarjeta-cabecera">
            <div>
              <p className="seccion-etiqueta">Identificación</p>
              <h2>Personal identificado</h2>
            </div>

            <button type="button" className="boton-salir" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>

          <dl className="datos-conexion">
            <div>
              <dt>Nombre</dt>
              <dd>{user.name}</dd>
            </div>

            <div>
              <dt>Tipo de personal</dt>
              <dd>{user.role}</dd>
            </div>

            <div>
              <dt>Identificador de sesión</dt>
              <dd>{user.id}</dd>
            </div>
          </dl>
        </section>

        <ChannelSelector
          selectedChannelId={selectedChannelId}
          onSelectChannel={handleSelectChannel}
        />

        <MessageComposer
          channelId={selectedChannelId}
          channelName={selectedChannel?.name ?? 'Sin seleccionar'}
          connected={status === 'connected'}
          onSend={sendMessage}
        />

        <ConnectedUsers
          users={connectedUsers}
          currentUserId={user.id}
          connectionStatus={status}
        />

        <ReceivedMessages
          messages={receivedMessages}
          currentUserId={user.id}
          channelName={selectedChannel?.name ?? null}
        />

        <SupportRequestForm
          connected={status === 'connected'}
          onSend={sendSupportRequest}
        />

        <section className="tarjeta" aria-labelledby="titulo-conexion">
          <div className="tarjeta-cabecera">
            <div>
              <p className="seccion-etiqueta">Conexión en tiempo real</p>
              <h2 id="titulo-conexion">Estado del broker MQTT</h2>
            </div>
            <span className="etiqueta-protocolo">WebSocket</span>
          </div>

          <div className={`estado estado--${status}`} role="status" aria-live="polite">
            <span className="estado-indicador" aria-hidden="true" />
            <div>
              <strong>{estado.titulo}</strong>
              <p>{estado.descripcion}</p>
            </div>
          </div>

          <dl className="datos-conexion">
            <div>
              <dt>Dirección del broker</dt>
              <dd>{url}</dd>
            </div>
            <div>
              <dt>Identificador del cliente</dt>
              <dd>{clientId}</dd>
            </div>
            <div>
              <dt>Protocolo de comunicación</dt>
              <dd>MQTT sobre WebSocket</dd>
            </div>
          </dl>

          {error && status !== 'connected' && (
            <p className="error-conexion" role="alert">
              No se pudo establecer la conexión: {error}
            </p>
          )}
        </section>

        <p className="nota">
          La aplicación administra la conexión y la reconexión de forma automática.
        </p>
        <footer className="pie">Servicios Telemáticos · Grupo 6</footer>
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
