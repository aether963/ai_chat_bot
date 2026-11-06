const API_URL = import.meta.env.VITE_API_URL;

export async function sendMessage(message, threadId) {
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

  // Read the response as text first.
  const responseText = await response.text();

  console.log("Backend status:", response.status);
  console.log("Backend response:", responseText);

  // Handle empty responses.
  if (!responseText) {
    throw new Error(
      `Backend returned an empty response. HTTP ${response.status}`,
    );
  }

  // Parse JSON safely.
  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Backend returned invalid JSON: ${responseText}`);
  }

  if (!response.ok) {
    throw new Error(data.detail || `Backend error: HTTP ${response.status}`);
  }

  return data;
}
