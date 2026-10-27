import { useCallback, useEffect, useRef, useState } from 'react'
import { createClientId, createMqttConnection, MQTT_URL } from '../services/mqttClient'
import { createPresenceClient, createPresenceWill } from '../services/presenceClient'
import { publishMessage } from '../services/messagePublisher'
import { parseReceivedMessage } from '../services/messageReceiver'
import { getChannelTopic } from '../config/channelOptions'
import { topics } from '../config/mqttTopics'
import { USER_ROLES } from '../services/userSession'
import { parseIncident } from '../services/incidentReceiver'
import { BUILDING_ID as EMERGENCY_BUILDING_ID } from '../config/channelOptions'
import { parseEmergency } from '../services/emergencyReceiver'

const BUILDING_ID = import.meta.env.VITE_BUILDING_ID ?? 'edificio-1'

function loadEmergencyHistory(userId) {
  if (!userId) return []

  try {
    const stored = JSON.parse(
      sessionStorage.getItem(`mqtt_hu12_alerts_${userId}`) || '[]'
    )

    return Array.isArray(stored)
      ? stored
          .filter(
            (item) =>
              typeof item?.id === 'string' &&
              typeof item?.description === 'string'
          )
          .slice(0, 100)
      : []
  } catch {
    return []
  }
}

export function useMqtt(user = null, url = MQTT_URL, selectedChannelId = null) {
  const [clientId] = useState(createClientId)
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)

  const [connectedUsers, setConnectedUsers] = useState([])
  const [receivedMessages, setReceivedMessages] = useState([])
  const [supportRequests, setSupportRequests] = useState([])
  const [incidentReports, setIncidentReports] = useState([])

  const [emergencyAlerts, setEmergencyAlerts] = useState(() =>
    loadEmergencyHistory(user?.id)
  )

  const [activeEmergencies, setActiveEmergencies] = useState([])

  const [
    emergencySubscriptionStatus,
    setEmergencySubscriptionStatus
  ] = useState('pending')

  const [subscribedChannelId, setSubscribedChannelId] = useState(null)

  const clientRef = useRef(null)
  const subscriptionQueueRef = useRef(Promise.resolve())

  const userId = user?.id
  const userName = user?.name
  const userRole = user?.role

  // CONEXIÓN PRINCIPAL MQTT

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
          setActiveEmergencies([])
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

  // MENSAJERÍA NORMAL

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
        console.warn(
          'HU08: mensaje MQTT descartado:',
          receiveError.message
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
            console.warn(
              'Error al cancelar suscripción:',
              unsubscribeError.message
            )
          }

          resolve()
        })
      })
    }

    client.on('message', handleMessage)

    subscriptionQueueRef.current = subscriptionQueueRef.current
      .catch(() => {})
      .then(subscribeAsync)

    return () => {
      active = false

      client.removeListener('message', handleMessage)

      subscriptionQueueRef.current = subscriptionQueueRef.current
        .catch(() => {})
        .then(unsubscribeAsync)
    }
  }, [status, selectedChannelId])

  // SOLICITUDES DE SOPORTE HU10

  useEffect(() => {
    const client = clientRef.current

    if (!client || status !== 'connected') {
      return
    }

    const canReceiveSupport =
      userRole === USER_ROLES?.MANTENIMIENTO ||
      userRole === USER_ROLES?.ADMINISTRACION

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
          typeof payload === 'string'
            ? payload
            : new TextDecoder().decode(payload)

        const parsed = JSON.parse(raw)

        if (!parsed || typeof parsed !== 'object') {
          return
        }

        if (parsed.type !== 'soporte' && !parsed.description) {
          return
        }

        setSupportRequests((previous) => {
          if (
            parsed.id &&
            previous.some((item) => item.id === parsed.id)
          ) {
            return previous
          }

          const request = {
            id: parsed.id || crypto.randomUUID(),
            requesterId:
              parsed.requesterId || parsed.senderId || null,
            requesterName:
              parsed.requesterName ||
              parsed.senderName ||
              'Desconocido',
            requesterRole:
              parsed.requesterRole || parsed.senderRole || '',
            description:
              parsed.description || parsed.content || '',
            timestamp:
              parsed.timestamp || new Date().toISOString(),
            topic: receivedTopic
          }

          return [request, ...previous].slice(0, 100)
        })
      } catch (supportError) {
        console.warn(
          'HU10: solicitud de soporte descartada:',
          supportError.message
        )
      }
    }

    function subscribeAsync() {
      return new Promise((resolve) => {
        if (!active || !client.connected) {
          resolve()
          return
        }

        client.subscribe(
          supportTopic,
          { qos: 1 },
          (subscribeError) => {
            if (subscribeError && active) {
              setError(subscribeError.message)
            }

            resolve()
          }
        )
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

  // REPORTES DE INCIDENTES HU11

  useEffect(() => {
    const client = clientRef.current

    if (!client || status !== 'connected') {
      return
    }

    const canReceiveIncidents =
      userRole === USER_ROLES.SEGURIDAD ||
      userRole === USER_ROLES.ADMINISTRACION

    if (!canReceiveIncidents) {
      return
    }

    const topic = topics.incidentes.reportes(BUILDING_ID)

    let active = true

    function handleIncidentMessage(receivedTopic, payload) {
      if (!active || receivedTopic !== topic) {
        return
      }

      try {
        const incident = parseIncident(payload)

        setIncidentReports((previous) => {
          const exists = previous.some(
            (item) => item.id === incident.id
          )

          if (exists) {
            return previous
          }

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

    subscriptionQueueRef.current = subscriptionQueueRef.current
      .catch(() => {})
      .then(subscribeAsync)

    return () => {
      active = false

      client.removeListener('message', handleIncidentMessage)
    }
  }, [status, userRole])

  // EMERGENCIAS HU12
  // RECIBE ALERTAS NUEVAS Y EMERGENCIAS ACTIVAS RETENIDAS

  useEffect(() => {
    const client = clientRef.current

    if (!client || status !== 'connected') {
      setEmergencySubscriptionStatus('pending')
      return
    }

    const emergencyTopic =
      topics.alertas.emergencias(EMERGENCY_BUILDING_ID)

    const activePrefix =
      `${topics.alertas.emergenciasActivas(EMERGENCY_BUILDING_ID)}/`

    const activeFilter =
      topics.alertas.emergenciasActivasSuscripcion(
        EMERGENCY_BUILDING_ID
      )

    let active = true

    setEmergencySubscriptionStatus('pending')
    setActiveEmergencies([])

    function handleEmergencyMessage(receivedTopic, payload) {
      if (!active) {
        return
      }

      // MENSAJES DE EMERGENCIAS ACTIVAS

      if (receivedTopic.startsWith(activePrefix)) {
        const alertId = receivedTopic.slice(activePrefix.length)

        if (!/^[0-9a-f-]{36}$/i.test(alertId)) {
          return
        }

        // UN MENSAJE RETENIDO VACÍO SIGNIFICA
        // QUE LA EMERGENCIA FUE RESUELTA

        if (payload.length === 0) {
          setActiveEmergencies((previous) =>
            previous.filter((item) => item.id !== alertId)
          )

          setEmergencyAlerts((previous) =>
            previous.map((item) =>
              item.id === alertId
                ? { ...item, resolved: true }
                : item
            )
          )

          return
        }

        // RECUPERAR EMERGENCIAS ACTIVAS

        try {
          const alert = parseEmergency(
            receivedTopic,
            payload
          )

          setActiveEmergencies((previous) => {
            const exists = previous.some(
              (item) => item.id === alert.id
            )

            if (exists) {
              return previous
            }

            return [alert, ...previous].slice(0, 100)
          })

          // CONSERVAR TAMBIÉN EN EL HISTORIAL

          setEmergencyAlerts((previous) => {
            const exists = previous.some(
              (item) => item.id === alert.id
            )

            if (exists) {
              return previous
            }

            return [alert, ...previous].slice(0, 100)
          })
        } catch (receiveError) {
          console.warn(
            'HU12: emergencia activa descartada:',
            receiveError.message
          )
        }

        return
      }

      // MENSAJES NUEVOS DEL CANAL GENERAL

      if (receivedTopic !== emergencyTopic) {
        return
      }

      try {
        const alert = parseEmergency(
          receivedTopic,
          payload
        )

        setEmergencyAlerts((previous) => {
          const exists = previous.some(
            (item) => item.id === alert.id
          )

          if (exists) {
            return previous
          }

          return [alert, ...previous].slice(0, 100)
        })
      } catch (receiveError) {
        console.warn(
          'HU12: alerta descartada:',
          receiveError.message
        )
      }
    }

    client.on('message', handleEmergencyMessage)

    // SUSCRIBIR A AMBOS CANALES

    subscriptionQueueRef.current =
      subscriptionQueueRef.current
        .catch(() => {})
        .then(
          () =>
            new Promise((resolve) => {
              if (!active || !client.connected) {
                resolve()
                return
              }

              client.subscribe(
                [emergencyTopic, activeFilter],
                { qos: 1 },
                (subscribeError, granted) => {
                  if (active) {
                    const failed =
                      subscribeError ||
                      granted?.length !== 2 ||
                      granted.some((item) => item.qos !== 1)

                    if (failed) {
                      setEmergencySubscriptionStatus('failed')

                      setError(
                        'No se pudo activar el canal de emergencias.'
                      )
                    } else {
                      setEmergencySubscriptionStatus('active')
                    }
                  }

                  resolve()
                }
              )
            })
        )

    return () => {
      active = false

      client.removeListener(
        'message',
        handleEmergencyMessage
      )
    }
  }, [status])

  // GUARDAR HISTORIAL DE EMERGENCIAS DURANTE LA SESIÓN

  useEffect(() => {
    if (!userId) {
      return
    }

    try {
      sessionStorage.setItem(
        `mqtt_hu12_alerts_${userId}`,
        JSON.stringify(emergencyAlerts)
      )
    } catch (storageError) {
      console.warn(
        'HU12: no se pudo guardar el historial:',
        storageError.message
      )
    }
  }, [userId, emergencyAlerts])

  // ENVÍO DE MENSAJES NORMALES

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

  // DATOS DISPONIBLES PARA APP.JSX

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
    emergencyAlerts,
    activeEmergencies,
    emergencySubscriptionStatus,
    subscribedChannelId:
      status === 'connected' &&
      subscribedChannelId === selectedChannelId
        ? subscribedChannelId
        : null,
    clientRef
  }
}