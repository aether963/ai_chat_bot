const API_URL = import.meta.env.VITE_API_URL;

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
