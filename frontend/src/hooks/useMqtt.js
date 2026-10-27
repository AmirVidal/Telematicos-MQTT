import { useCallback, useEffect, useRef, useState } from 'react'
import { createClientId, createMqttConnection, MQTT_URL } from '../services/mqttClient'
import { createPresenceClient, createPresenceWill } from '../services/presenceClient'
import { publishMessage } from '../services/messagePublisher'
import { parseReceivedMessage } from '../services/messageReceiver'
import { getChannelTopic } from '../config/channelOptions'
import { topics } from '../config/mqttTopics'
import { USER_ROLES } from '../services/userSession'
import { parseIncident } from '../services/incidentReceiver'

const BUILDING_ID = import.meta.env.VITE_BUILDING_ID ?? 'edificio-1'

export function useMqtt(user = null, url = MQTT_URL, selectedChannelId = null) {
  const [clientId] = useState(createClientId)
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)
  const [connectedUsers, setConnectedUsers] = useState([])
  const [receivedMessages, setReceivedMessages] = useState([])
  const [supportRequests, setSupportRequests] = useState([])
  const [incidentReports, setIncidentReports] = useState([])
  const [subscribedChannelId, setSubscribedChannelId] = useState(null)
  const clientRef = useRef(null)
  const subscriptionQueueRef = useRef(Promise.resolve())

  const userId = user?.id
  const userName = user?.name
  const userRole = user?.role

  useEffect(() => {
    let active = true

    const connection = createMqttConnection({
      url,
      clientId,
      userRole,
      will: userId ? createPresenceWill(clientId) : undefined,

      onStatus: (nextStatus) => {
        if (!active) return

        setStatus(nextStatus)

        if (nextStatus === 'disconnected') {
          setConnectedUsers([])
        }
      },

      onError: (nextError) => {
        if (active) {
          setError(nextError?.message ?? null)
        }
      }
    })

    clientRef.current = connection.client

    const presence = userId
      ? createPresenceClient({
          client: connection.client,
          clientId,
          user: {
            id: userId,
            name: userName,
            role: userRole
          },
          onUsers: (users) => {
            if (active) setConnectedUsers(users)
          },
          onError: (presenceError) => {
            if (active) setError(presenceError.message)
          }
        })
      : null

    return () => {
      active = false
      if (clientRef.current === connection.client) {
        clientRef.current = null
      }

      if (presence) {
        presence.stop(() => connection.stop())
      } else {
        connection.stop()
      }
    }
  }, [url, clientId, userId, userName, userRole])

  useEffect(() => {
    const client = clientRef.current

    if (!client || status !== 'connected' || !selectedChannelId) {
      return
    }

    const topic = getChannelTopic(selectedChannelId)

    if (!topic) {
      return
    }

    let active = true

    function handleMessage(receivedTopic, payload) {
      if (!active || receivedTopic !== topic) return

      try {
        const message = parseReceivedMessage(receivedTopic, payload)
        setReceivedMessages((previous) => {
          if (previous.some((item) => item.id === message.id)) {
            return previous
          }

          return [...previous, message].slice(-200)
        })
      } catch (receiveError) {
        console.warn('HU08: mensaje MQTT descartado:', receiveError.message)
      }
    }

    function subscribeAsync() {
      return new Promise((resolve) => {
        if (!active || !client.connected) {
          resolve()
          return
        }

        client.subscribe(topic, { qos: 1 }, (subscribeError) => {
          if (subscribeError) {
            if (active) {
              setError(subscribeError.message)
            }
          } else if (active) {
            setSubscribedChannelId(selectedChannelId)
          }

          resolve()
        })
      })
    }

    function unsubscribeAsync() {
      return new Promise((resolve) => {
        if (!client.connected) {
          resolve()
          return
        }

        client.unsubscribe(topic, (unsubscribeError) => {
          if (unsubscribeError) {
            console.warn('error al cancelar suscripción:', unsubscribeError.message)
          }
          resolve()
        })
      })
    }

    client.on('message', handleMessage)

    // Ejecutar las suscripciones en orden
    subscriptionQueueRef.current = subscriptionQueueRef.current.catch(() => {}).then(subscribeAsync)

    return () => {
      active = false
      client.removeListener('message', handleMessage)

      // Cancelar esta suscripción antes de procesar la siguiente
      subscriptionQueueRef.current = subscriptionQueueRef.current
        .catch(() => {})
        .then(unsubscribeAsync)
    }
  }, [status, selectedChannelId])

  useEffect(() => {
    const client = clientRef.current

    if (!client || status !== 'connected') {
      return
    }

    const canReceiveSupport =
      userRole === USER_ROLES?.MANTENIMIENTO || userRole === USER_ROLES?.ADMINISTRACION

    if (!canReceiveSupport) {
      return
    }

    const supportTopic = topics.comandos.soporte(BUILDING_ID)
    let active = true

    function handleSupportMessage(receivedTopic, payload) {
      if (!active || receivedTopic !== supportTopic) {
        return
      }

      try {
        const raw =
          typeof payload === 'string' ? payload : new TextDecoder().decode(payload)
        const parsed = JSON.parse(raw)

        if (!parsed || typeof parsed !== 'object') {
          return
        }

        if (parsed.type !== 'soporte' && !parsed.description) {
          return
        }

        setSupportRequests((previous) => {
          if (parsed.id && previous.some((item) => item.id === parsed.id)) {
            return previous
          }

          const request = {
            id: parsed.id || crypto.randomUUID(),
            requesterId: parsed.requesterId || parsed.senderId || null,
            requesterName: parsed.requesterName || parsed.senderName || 'Desconocido',
            requesterRole: parsed.requesterRole || parsed.senderRole || '',
            description: parsed.description || parsed.content || '',
            timestamp: parsed.timestamp || new Date().toISOString(),
            topic: receivedTopic
          }

          return [request, ...previous].slice(0, 100)
        })
      } catch (supportError) {
        console.warn('HU10: solicitud de soporte descartada:', supportError.message)
      }
    }

    function subscribeAsync() {
      return new Promise((resolve) => {
        if (!active || !client.connected) {
          resolve()
          return
        }

        client.subscribe(supportTopic, { qos: 1 }, (subscribeError) => {
          if (subscribeError && active) {
            setError(subscribeError.message)
          }
          resolve()
        })
      })
    }

    client.on('message', handleSupportMessage)
    subscriptionQueueRef.current = subscriptionQueueRef.current
      .catch(() => {})
      .then(subscribeAsync)

    return () => {
      active = false
      client.removeListener('message', handleSupportMessage)
    }
  }, [status, userRole])
  
  
  useEffect(() => {
    const client = clientRef.current

    if (!client || status !== 'connected') return

    const canReceiveIncidents =
      userRole === USER_ROLES.SEGURIDAD ||
      userRole === USER_ROLES.ADMINISTRACION

    if (!canReceiveIncidents) return

    const topic = topics.incidentes.reportes(BUILDING_ID)
    let active = true

    function handleIncidentMessage(receivedTopic, payload) {
      if (!active || receivedTopic !== topic) return

      try {
        const incident = parseIncident(payload)

        setIncidentReports((previous) => {
          const exists = previous.some(
            (item) => item.id === incident.id
          )

          if (exists) return previous

          return [incident, ...previous].slice(0, 100)
        })
      } catch (incidentError) {
        console.warn(
          'HU11: reporte descartado:',
          incidentError.message
        )
      }
    }

    function subscribeAsync() {
      return new Promise((resolve) => {
        if (!active || !client.connected) {
          resolve()
          return
        }

        client.subscribe(topic, { qos: 1 }, (subscribeError) => {
          if (subscribeError && active) {
            setError(subscribeError.message)
          }

          resolve()
        })
      })
    }

    client.on('message', handleIncidentMessage)

    subscriptionQueueRef.current =
      subscriptionQueueRef.current
        .catch(() => {})
        .then(subscribeAsync)

    return () => {
      active = false
      client.removeListener('message', handleIncidentMessage)
    }
  }, [status, userRole])

  const sendMessage = useCallback(
    async (channelId, content) => {
      const client = clientRef.current

      if (!client || !client.connected) {
        throw new Error('No hay conexión con el broker MQTT.')
      }

      if (!userId || !userName || !userRole) {
        throw new Error('El usuario no está identificado.')
      }

      return publishMessage({
        client,
        user: {
          id: userId,
          name: userName,
          role: userRole
        },
        channelId,
        content
      })
    },
    [userId, userName, userRole]
  )

  return {
    url,
    clientId,
    status,
    error,
    connectedUsers,
    sendMessage,
    receivedMessages,
    supportRequests,
    incidentReports,
    subscribedChannelId:
      status === 'connected' && subscribedChannelId === selectedChannelId
        ? subscribedChannelId
        : null,
    clientRef
  }
}
