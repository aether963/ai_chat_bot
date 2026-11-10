const API_URL = import.meta.env.VITE_API_URL;

// 1. Create a new chat
export async function createChat(chat) {
  const response = await fetch(`${API_URL}/chats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(chat),
  });

  if (!response.ok) {
    throw new Error(`Failed to create chat: HTTP ${response.status}`);
  }

  return response.json();
}

// 2. Get all chats
export async function getChats() {
  const response = await fetch(`${API_URL}/chats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch chats: HTTP ${response.status}`);
  }

  return response.json();
}

// 3. Get a specific chat with messages
export async function getChat(chatId) {
  const response = await fetch(`${API_URL}/chats/${chatId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch chat: HTTP ${response.status}`);
  }

  return response.json();
}

// 4. Delete a chat
export async function deleteChat(chatId) {
  const response = await fetch(`${API_URL}/chats/${chatId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete chat: HTTP ${response.status}`);
  }

  return response.json();
}

// 5. Send message with streaming
export async function sendMessage(message, threadId, onToken) {
  let response;

  try {
    response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        thread_id: threadId,
      }),
    });
  } catch (error) {
    throw new Error(
      `Cannot connect to backend. Check whether FastAPI is running. ${error.message}`,
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend error: ${errorText || response.status}`);
  }

  if (!response.body) {
    throw new Error("Backend does not support streaming responses.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let thread_id = threadId;

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const dataLine = event
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (!dataLine) continue;

        const data = JSON.parse(dataLine.slice(5).trim());

        if (data.type === "token") {
          onToken(data.content);
        } else if (data.type === "done") {
          thread_id = data.thread_id;
        } else if (data.type === "error") {
          throw new Error(data.message);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { thread_id };
}

export async function updateChat(chatId, title) {
  const response = await fetch(`${API_URL}/chats/${chatId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update chat: HTTP ${response.status}`);
  }

  return response.json();
}
