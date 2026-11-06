import { ArrowUp, Paperclip } from "lucide-react";
import { useState } from "react";

export default function ChatInput({ onSend, isLoading }) {
  const [input, setInput] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || isLoading) return;

    onSend(message);
    setInput("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  }

  return (
    <div className="composer-area">
      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          className="chat-textarea"
          placeholder="Message Neural Chat..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label="Message"
          disabled={isLoading}
        />

        <div className="composer-toolbar">
          <button
            type="button"
            className="icon-button attachment-button"
            aria-label="Attachments (coming soon)"
            title="Attachments coming soon"
            disabled
          >
            <Paperclip size={18} />
          </button>

          <div className="composer-right">
            <span className="model-label">LangGraph</span>
            <button
              className="send-button"
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              title="Send message"
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
      </form>

      <p className="composer-disclaimer">
        AI can make mistakes. Verify important information.
      </p>
    </div>
  );
}
