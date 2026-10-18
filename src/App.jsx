import { useState, useEffect } from 'react'
import { topics, ESTADOS_PERSONAL } from './config/mqttTopics'
import { connect, subscribe, publish, disconnect } from './services/mqttService'
import './App.css'

const EDIFICIO_ID = 'torre-norte'
const PERSONAL_ID = 'operador-01'

function App() {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('disponible')

  useEffect(() => {
    const client = connect({ clientId: PERSONAL_ID })

    client.on('connect', () => {
      setConnected(true)

      subscribe(topics.personal.presencia(EDIFICIO_ID, PERSONAL_ID), (t, msg) => {
        setMessages((prev) => [...prev, { topic: t, msg }])
      })

      subscribe(topics.comandos.broadcast(EDIFICIO_ID), (t, msg) => {
        setMessages((prev) => [...prev, { topic: t, msg }])
      })

      subscribe(topics.alertas.tipo(EDIFICIO_ID, 'general'), (t, msg) => {
        setMessages((prev) => [...prev, { topic: t, msg }])
      })

      publish(topics.personal.presencia(EDIFICIO_ID, PERSONAL_ID), {
        online: true,
        ts: Date.now(),
      })
    })

    client.on('close', () => setConnected(false))
    client.on('error', (err) => console.error(err))

    return () => disconnect()
  }, [])

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    publish(topics.personal.estado(EDIFICIO_ID, PERSONAL_ID), {
      personalId: PERSONAL_ID,
      estado: newStatus,
      ts: Date.now(),
    })
  }

  const sendBroadcast = () => {
    const msg = prompt('Mensaje para todo el personal:')
    if (!msg) return
    publish(topics.comandos.broadcast(EDIFICIO_ID), {
      from: PERSONAL_ID,
      mensaje: msg,
      ts: Date.now(),
    })
  }

  const sendAlert = () => {
    publish(topics.alertas.tipo(EDIFICIO_ID, 'general'), {
      tipo: 'general',
      mensaje: 'Alerta de prueba',
      ts: Date.now(),
    })
  }

  return (
    <div className="app">
      <header>
        <h1>Telematicos MQTT</h1>
        <span className={`status ${connected ? 'online' : 'offline'}`}>
          {connected ? '● Conectado' : '○ Desconectado'}
        </span>
      </header>

      <section>
        <h2>Estado del personal</h2>
        <div className="buttons">
          {ESTADOS_PERSONAL.map((e) => (
            <button
              key={e}
              className={status === e ? 'active' : ''}
              onClick={() => handleStatusChange(e)}
            >
              {e.replace('_', ' ')}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Acciones</h2>
        <button onClick={sendBroadcast}>Enviar broadcast</button>
        <button onClick={sendAlert}>Enviar alerta general</button>
      </section>

      <section>
        <h2>Mensajes recibidos ({messages.length})</h2>
        <div className="messages">
          {messages.length === 0 && <p className="empty">Sin mensajes aún</p>}
          {messages.map((m, i) => (
            <div key={i} className="message">
              <code>{m.topic}</code>
              <pre>{JSON.stringify(m.msg, null, 2)}</pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default App
