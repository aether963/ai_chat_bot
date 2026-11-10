import { useState } from "react";
import {
  MessageSquare,
  Plus,
  X,
  Bot,
  Trash2,
  Pencil,
  Check,
  XCircle,
} from "lucide-react";

export default function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  isOpen,
  onClose,
}) {
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  function startEditing(chat) {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  }

  function cancelEditing() {
    setEditingChatId(null);
    setEditingTitle("");
  }

  async function saveEditing(chatId) {
    const title = editingTitle.trim();

    if (!title) return;

    await onRenameChat(chatId, title);

    cancelEditing();
  }

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
            {chats.length === 0 ? (
              <p className="empty-history">Your chats will appear here.</p>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`history-item ${
                    chat.id === activeChatId ? "active" : ""
                  }`}
                >
                  {editingChatId === chat.id ? (
                    <div className="rename-container">
                      <input
                        className="rename-input"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditing(chat.id);
                          if (e.key === "Escape") cancelEditing();
                        }}
                        autoFocus
                        maxLength={255}
                      />

                      <button
                        className="history-action save-button"
                        onClick={() => saveEditing(chat.id)}
                        aria-label="Save title"
                        title="Save"
                      >
                        <Check size={15} />
                      </button>

                      <button
                        className="history-action cancel-button"
                        onClick={cancelEditing}
                        aria-label="Cancel rename"
                        title="Cancel"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
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
                        className="history-action"
                        onClick={() => startEditing(chat)}
                        aria-label={`Rename ${chat.title}`}
                        title="Rename conversation"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        className="history-delete"
                        onClick={() => onDeleteChat(chat.id)}
                        aria-label={`Delete ${chat.title}`}
                        title="Delete conversation"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
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
