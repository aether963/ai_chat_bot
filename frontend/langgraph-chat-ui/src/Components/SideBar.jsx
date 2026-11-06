import { MessageSquare, Plus, X, Bot, Trash2 } from "lucide-react";

export default function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isOpen,
  onClose,
}) {
  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <Bot size={22} />
            </div>
            <span>Neural Chat</span>
          </div>

          <button
            className="icon-button mobile-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <button className="new-chat-button" onClick={onNewChat}>
          <Plus size={18} />
          <span>New chat</span>
        </button>

        <div className="history-section">
          <p className="section-label">YOUR CONVERSATIONS</p>

          <div className="chat-history">
            {chats.filter((chat) => chat.messages.length > 0).length === 0 ? (
              <p className="empty-history">Your chats will appear here.</p>
            ) : (
              chats
                .filter((chat) => chat.messages.length > 0)
                .map((chat) => (
                  <div
                    key={chat.id}
                    className={`history-item ${
                      chat.id === activeChatId ? "active" : ""
                    }`}
                  >
                    <button
                      className="history-select"
                      onClick={() => {
                        onSelectChat(chat.id);
                        onClose();
                      }}
                      title={chat.title}
                    >
                      <MessageSquare size={16} />
                      <span>{chat.title}</span>
                    </button>

                    <button
                      className="history-delete"
                      onClick={() => onDeleteChat(chat.id)}
                      aria-label={`Delete ${chat.title}`}
                      title="Delete conversation"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="avatar">RG</div>
          <div className="profile-details">
            <span className="profile-name">My Account</span>
            <span className="profile-subtitle">AI workspace</span>
          </div>
        </div>
      </aside>
    </>
  );
}
