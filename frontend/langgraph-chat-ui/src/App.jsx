import { useState, useEffect } from "react";
import Sidebar from "./Components/SideBar";
import ChatWindow from "./Components/ChatWindow";
import {
  sendMessage,
  createChat,
  getChats,
  getChat,
  deleteChat,
  updateChat,
} from "./Services/chatAPI";
import "./App.css";

function createLocalChat() {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    isPersisted: false,
  };
}

export default function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load saved chats when the application starts.

  useEffect(() => {
    async function loadChats() {
      try {
        const response = await getChats();

        const savedChats = Array.isArray(response)
          ? response
          : response.chats || [];

        if (savedChats.length > 0) {
          const firstChat = savedChats[0];

          // Fetch messages for the initially selected conversation.
          const chatDetails = await getChat(firstChat.id);

          const messages = Array.isArray(chatDetails)
            ? chatDetails
            : chatDetails.messages || [];

          setChats(
            savedChats.map((chat) => ({
              ...chat,
              messages: chat.id === firstChat.id ? messages : [],
              isPersisted: true,
            })),
          );

          setActiveChatId(firstChat.id);
        } else {
          const newChat = createLocalChat();
          setChats([newChat]);
          setActiveChatId(newChat.id);
        }
      } catch (error) {
        console.error("Failed to load chats:", error);

        const newChat = createLocalChat();
        setChats([newChat]);
        setActiveChatId(newChat.id);
      }
    }

    loadChats();
  }, []);

  const currentChatId = activeChatId ?? chats[0]?.id;
  const activeChat = chats.find((chat) => chat.id === currentChatId);

  function handleNewChat() {
    const newChat = createLocalChat();

    setChats((previous) => [newChat, ...previous]);
    setActiveChatId(newChat.id);
    setIsSidebarOpen(false);
  }

  // Restore messages when selecting a saved conversation.
  async function handleSelectChat(chatId) {
    setActiveChatId(chatId);
    setIsSidebarOpen(false);

    const selectedChat = chats.find((chat) => chat.id === chatId);

    if (!selectedChat || !selectedChat.isPersisted) {
      return;
    }

    try {
      const response = await getChat(chatId);

      // Supports either { messages: [...] } or a direct response array.
      const messages = Array.isArray(response)
        ? response
        : response.messages || [];

      setChats((previous) =>
        previous.map((chat) =>
          chat.id === chatId ? { ...chat, messages } : chat,
        ),
      );
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  }

  async function handleDeleteChat(chatId) {
    try {
      const chatToDelete = chats.find((chat) => chat.id === chatId);

      if (chatToDelete?.isPersisted) {
        await deleteChat(chatId);
      }

      const remaining = chats.filter((chat) => chat.id !== chatId);

      if (remaining.length === 0) {
        const newChat = createLocalChat();
        setChats([newChat]);
        setActiveChatId(newChat.id);
        return;
      }

      setChats(remaining);

      if (currentChatId === chatId) {
        setActiveChatId(remaining[0].id);

        if (remaining[0].isPersisted) {
          handleSelectChat(remaining[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
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

    const isFirstMessage = activeChat.messages.length === 0;

    const chatTitle = isFirstMessage
      ? message.slice(0, 35) + (message.length > 35 ? "..." : "")
      : activeChat.title;

    setIsLoading(true);

    setChats((previous) =>
      previous.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title: chatTitle,
              messages: [...chat.messages, userMessage, assistantMessage],
            }
          : chat,
      ),
    );

    try {
      // Create a database record for a new conversation.
      if (!activeChat.isPersisted) {
        await createChat({
          id: chatId,
          title: chatTitle,
        });

        setChats((previous) =>
          previous.map((chat) =>
            chat.id === chatId ? { ...chat, isPersisted: true } : chat,
          ),
        );
      }

      // Stream the assistant response.
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

      // Update timestamp only after successful response generation.
      const updatedChat = await updateChat(chatId, chatTitle);

      // Move the updated conversation to the top.
      setChats((previous) => {
        const updatedChats = previous.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                title: updatedChat.title,
                updated_at: updatedChat.updated_at,
                isPersisted: true,
              }
            : chat,
        );

        return updatedChats.sort(
          (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0),
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
        onRenameChat={handleRenameChat}
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

async function handleRenameChat(chatId, newTitle) {
  const title = newTitle.trim();

  if (!title) return;

  try {
    await updateChat(chatId, title);

    setChats((previous) =>
      previous.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)),
    );
  } catch (error) {
    console.error("Failed to rename chat:", error);
  }
}
