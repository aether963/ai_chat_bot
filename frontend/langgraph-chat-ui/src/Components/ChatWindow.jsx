import { Menu, Sparkles, Code2, Workflow, Brain } from "lucide-react";
import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

const suggestions = [
  {
    icon: <Code2 size={18} />,
    title: "Help me write code",
    prompt: "Help me write a clean Python function with an example.",
  },
  {
    icon: <Workflow size={18} />,
    title: "Build an AI agent",
    prompt: "Explain how to build an AI agent using LangGraph.",
  },
  {
    icon: <Brain size={18} />,
    title: "Explain a concept",
    prompt: "Explain LangGraph state and nodes with a simple example.",
  },
];

export default function ChatWindow({
  chat,
  isLoading,
  onSend,
  onToggleSidebar,
}) {
  const bottomRef = useRef(null);
  const hasMessages = chat.messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, isLoading]);

  return (
    <main className="chat-main">
      <header className="chat-header">
        <div className="header-left">
          <button
            className="icon-button menu-button"
            onClick={onToggleSidebar}
            aria-label="Open sidebar"
          >
            <Menu size={21} />
          </button>

          <div>
            <h1>Neural Chat</h1>
            <p className="header-subtitle">Your AI assistant</p>
          </div>
        </div>

        <div className="connection-status">
          <span className="status-dot" />
          <span>UI preview</span>
        </div>
      </header>

      <section className="messages-area">
        {!hasMessages ? (
          <div className="welcome-screen">
            <div className="welcome-icon">
              <Sparkles size={28} />
            </div>

            <h2>What can I help with?</h2>
            <p className="welcome-description">
              Ask a question, explore an idea, or build something useful.
            </p>

            <div className="suggestion-grid">
              {suggestions.map((suggestion) => (
                <button
                  className="suggestion-card"
                  key={suggestion.title}
                  onClick={() => onSend(suggestion.prompt)}
                  disabled={isLoading}
                >
                  <span className="suggestion-icon">{suggestion.icon}</span>
                  <span className="suggestion-title">{suggestion.title}</span>
                  <span className="suggestion-prompt">{suggestion.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {chat.messages
              .filter(
                (message) =>
                  !(
                    isLoading &&
                    message.role === "assistant" &&
                    !message.content
                  ),
              )
              .map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

            {isLoading &&
              chat.messages[chat.messages.length - 1]?.role === "assistant" &&
              !chat.messages[chat.messages.length - 1]?.content && (
                <div className="message-row assistant-row">
                  <div className="message-avatar">
                    <Sparkles size={18} />
                  </div>
                  <div className="message-content">
                    <div className="message-author">Neural Chat</div>
                    <div className="typing-indicator" aria-label="Thinking">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

            <div ref={bottomRef} />
          </div>
        )}
      </section>

      <ChatInput onSend={onSend} isLoading={isLoading} />
    </main>
  );
}
