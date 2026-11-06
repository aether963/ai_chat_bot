import { Bot, User, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Could not copy message:", error);
    }
  }

  return (
    <div className={`message-row ${isUser ? "user-row" : "assistant-row"}`}>
      <div className={`message-avatar ${isUser ? "user-avatar" : ""}`}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div className="message-content">
        <div className="message-author">{isUser ? "You" : "Neural Chat"}</div>

        <div className={`message-bubble ${isUser ? "user-bubble" : ""}`}>
          {isUser ? (
            <div className="message-text">{message.content}</div>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && (
          <button
            className="copy-button"
            onClick={copyMessage}
            aria-label="Copy assistant response"
            title="Copy response"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
