import ConnectedUsers from '../ConnectedUsers'
import './PersonnelView.css'

export default function PersonnelView({ users, currentUserId, connectionStatus }) {
  return (
    <section className="personnel-view" aria-label="Personal conectado">
      <div className="personnel-view-content">
        <ConnectedUsers
          users={users}
          currentUserId={currentUserId}
          connectionStatus={connectionStatus}
        />
      </div>
    </section>
  )
}
