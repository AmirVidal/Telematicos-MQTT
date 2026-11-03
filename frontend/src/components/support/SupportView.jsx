import { useCallback, useEffect, useMemo, useState } from 'react'
import SupportRequestForm from '../SupportRequestForm'
import SupportRequestsList from '../SupportRequestsList'
import SupportChat from './SupportChat'
import SupportChatsList from './SupportChatsList'
import SupportResolutionForm from './SupportResolutionForm'
import SupportResolvedList from './SupportResolvedList'
import {
  downloadSupportEvidence,
  getActiveSupportRequests,
  getResolvedSupportCases,
  getSupportChatMessages,
  getSupportChats,
  respondSupportRequest,
  sendSupportChatMessage
} from '../../services/supportService'
import './SupportView.css'

const ACTIVE_STATUSES = new Set(['pendiente', 'en_proceso'])

function requestKey(item) {
  return item?.requestId || item?.id || null
}

function mergeRequests(serverRequests, liveRequests, hiddenIds) {
  const hidden = new Set(hiddenIds)
  const merged = new Map()

  for (const item of serverRequests) {
    const key = requestKey(item)
    if (!key || hidden.has(key)) continue
    merged.set(key, { ...item, id: key })
  }

  for (const item of liveRequests) {
    const key = requestKey(item)
    if (!key || hidden.has(key) || merged.has(key)) continue

    const status = item.status || 'pendiente'
    if (!ACTIVE_STATUSES.has(status)) continue

    merged.set(key, { ...item, id: key, status })
  }

  return [...merged.values()].filter((item) =>
    ACTIVE_STATUSES.has(item.status || 'pendiente')
  )
}

export default function SupportView({ user, connected, onSend, requests = [] }) {
  const isMaintenance = user.role === 'mantenimiento'
  const canViewAll = isMaintenance || user.role === 'administracion'

  const [serverRequests, setServerRequests] = useState([])
  const [chats, setChats] = useState([])
  const [resolutions, setResolutions] = useState([])
  const [hiddenRequestIds, setHiddenRequestIds] = useState([])
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [chatData, setChatData] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [busyRequestId, setBusyRequestId] = useState(null)
  const [resolutionTarget, setResolutionTarget] = useState(null)
  const [error, setError] = useState('')

  const loadSupport = useCallback(async () => {
    try {
      const [activeRequests, supportChats] = await Promise.all([
        getActiveSupportRequests(user),
        getSupportChats(user)
      ])

      setServerRequests(activeRequests)
      setChats(supportChats)

      if (canViewAll) {
        const resolved = await getResolvedSupportCases(user)
        setResolutions(resolved)
      }

      setError('')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }, [user, canViewAll])

  useEffect(() => {
    const timer = window.setTimeout(loadSupport, 0)
    return () => window.clearTimeout(timer)
  }, [loadSupport])

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        loadSupport()
      }
    }, 6000)

    return () => window.clearInterval(interval)
  }, [loadSupport])

  useEffect(() => {
    if (!selectedRequestId) return undefined

    let active = true

    async function loadMessages() {
      try {
        const result = await getSupportChatMessages({
          requestId: selectedRequestId,
          user
        })

        if (!active) return

        setChatData(result.request)
        setMessages(result.messages)
      } catch (failure) {
        if (active) setError(failure.message)
      }
    }

    loadMessages()

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        loadMessages()
      }
    }, 4000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [selectedRequestId, user])

  const activeRequests = useMemo(
    () => mergeRequests(serverRequests, requests, hiddenRequestIds),
    [serverRequests, requests, hiddenRequestIds]
  )

  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null

    return (
      activeRequests.find((item) => requestKey(item) === selectedRequestId) ||
      chats.find((item) => requestKey(item) === selectedRequestId) ||
      (requestKey(chatData) === selectedRequestId ? chatData : null)
    )
  }, [activeRequests, chats, chatData, selectedRequestId])

  function handleSelectChat(requestId) {
    if (requestId !== selectedRequestId) {
      setChatData(null)
      setMessages([])
    }
    setSelectedRequestId(requestId)
  }

  async function handleCreateRequest(description) {
    const result = await onSend(description)
    await loadSupport()
    return result
  }

  async function handleRespond(request) {
    const requestId = requestKey(request)
    if (!requestId) return

    setBusyRequestId(requestId)
    setError('')

    try {
      await respondSupportRequest({ requestId, user })
      await loadSupport()
      handleSelectChat(requestId)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusyRequestId(null)
    }
  }

  async function handleSendMessage(content) {
    if (!selectedRequestId) return

    setSendingMessage(true)
    setError('')

    try {
      await sendSupportChatMessage({
        requestId: selectedRequestId,
        user,
        content
      })
      const result = await getSupportChatMessages({
        requestId: selectedRequestId,
        user
      })
      setChatData(result.request)
      setMessages(result.messages)
      await loadSupport()
    } catch (failure) {
      setError(failure.message)
      throw failure
    } finally {
      setSendingMessage(false)
    }
  }

  async function handleResolved(resolution) {
    const requestId = resolution?.requestId || requestKey(resolutionTarget)

    if (requestId) {
      setHiddenRequestIds((previous) =>
        previous.includes(requestId) ? previous : [...previous, requestId]
      )
    }

    setResolutionTarget(null)
    await loadSupport()
  }

  async function handleDownloadEvidence(resolution, evidence) {
    try {
      await downloadSupportEvidence({
        resolutionId: resolution.resolutionId,
        evidence
      })
      setError('')
    } catch (failure) {
      setError(failure.message)
    }
  }

  return (
    <section className="support-view" aria-label="Solicitudes de soporte">
      <div className="support-view-header">
        <h2>Soporte</h2>
        <p>
          Envía solicitudes de asistencia, responde las solicitudes como
          mantenimiento y conversa con el solicitante hasta resolver el caso.
        </p>
      </div>

      {error ? (
        <p className="soporte-feedback soporte-feedback--error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="soporte-lista-vacia" role="status">
          Cargando solicitudes de soporte...
        </p>
      ) : null}

      <div className="support-view-grid">
        <div className="support-view-form">
          <SupportRequestForm connected={connected} onSend={handleCreateRequest} />
        </div>

        <div className="support-view-list">
          <SupportRequestsList
            requests={activeRequests}
            currentUser={user}
            canRespond={isMaintenance}
            canResolve={isMaintenance}
            onRespond={handleRespond}
            onOpenChat={handleSelectChat}
            onResolve={setResolutionTarget}
            busyRequestId={busyRequestId}
          />
        </div>
      </div>

      <div className="support-chat-layout">
        <SupportChatsList
          chats={chats}
          currentUser={user}
          selectedRequestId={selectedRequestId}
          onSelect={handleSelectChat}
        />

        <SupportChat
          request={selectedRequest}
          messages={messages}
          currentUser={user}
          isMaintenance={isMaintenance}
          onSendMessage={handleSendMessage}
          onResolve={setResolutionTarget}
          sending={sendingMessage}
        />
      </div>

      {canViewAll ? (
        <SupportResolvedList
          resolutions={resolutions}
          onDownload={handleDownloadEvidence}
        />
      ) : null}

      {resolutionTarget ? (
        <SupportResolutionForm
          request={resolutionTarget}
          user={user}
          onClose={() => setResolutionTarget(null)}
          onResolved={handleResolved}
        />
      ) : null}
    </section>
  )
}
