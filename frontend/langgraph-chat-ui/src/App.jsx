import { useState } from "react";
import Sidebar from "./Components/SideBar";
import ChatWindow from "./Components/ChatWindow";
import { sendMessage } from "./Services/chatAPI";
import "./App.css";

function createChat() {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
  };
}

export default function App() {
  const [chats, setChats] = useState(() => [createChat()]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentChatId = activeChatId ?? chats[0]?.id;
  const activeChat = chats.find((chat) => chat.id === currentChatId);

  function handleNewChat() {
    const newChat = createChat();

    setChats((previous) => [newChat, ...previous]);
    setActiveChatId(newChat.id);
    setIsSidebarOpen(false);
  }

  function handleSelectChat(chatId) {
    setActiveChatId(chatId);
  }

  function handleDeleteChat(chatId) {
    const remaining = chats.filter((chat) => chat.id !== chatId);

    if (remaining.length === 0) {
      const newChat = createChat();
      setChats([newChat]);
      setActiveChatId(newChat.id);
      return;
    }

    setChats(remaining);

    if (currentChatId === chatId) {
      setActiveChatId(remaining[0].id);
    }
  }

  async function handleSend(message) {
    if (isLoading || !activeChat) return;

    const chatId = activeChat.id;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    setIsLoading(true);

    // Add user message and an empty assistant message.
    setChats((previous) =>
      previous.map((chat) => {
        if (chat.id !== chatId) return chat;

        const isFirstMessage = chat.messages.length === 0;

        return {
          ...chat,
          title: isFirstMessage
            ? message.slice(0, 35) + (message.length > 35 ? "..." : "")
            : chat.title,
          messages: [...chat.messages, userMessage, assistantMessage],
        };
      }),
    );

    try {
      // Receive tokens as they arrive from the backend.
      await sendMessage(message, chatId, (token) => {
        setChats((previous) =>
          previous.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg) =>
                    msg.id === assistantMessage.id
                      ? {
                          ...msg,
                          content: msg.content + token,
                        }
                      : msg,
                  ),
                }
              : chat,
          ),
        );
      });
    } catch (error) {
      console.error("Backend error:", error);

      setChats((previous) =>
        previous.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === assistantMessage.id
                    ? {
                        ...msg,
                        content: msg.content
                          ? `${msg.content}\n\n[Error: ${error.message}]`
                          : `Sorry, something went wrong: ${error.message}`,
                      }
                    : msg,
                ),
              }
            : chat,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        chats={chats}
        activeChatId={currentChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {activeChat && (
        <ChatWindow
          chat={activeChat}
          isLoading={isLoading}
          onSend={handleSend}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />
      )}
    </div>
  );
}
