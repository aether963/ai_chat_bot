import json
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from uuid import UUID

from langchain_core.messages import HumanMessage

from graph import chatbot

logger = logging.getLogger(__name__)

# 1. Initialize FastAPI
app = FastAPI(
    title="LangGraph Chat API"
)


# 2. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-chat-bot-pied-omega.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3. Define request schema
class ChatRequest(BaseModel):
    message: str
    thread_id: UUID

# enabling streaming


def sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


# 5. Create chat endpoint
@app.post("/chat")
async def chat(request: ChatRequest):

    config = {
        "configurable": {
            "thread_id": str(request.thread_id)
        }
    }

    async def generate():
        try:
            async for message_chunk, metadata in chatbot.astream(
                {
                    "messages": [
                        HumanMessage(content=request.message)
                    ]
                },
                config=config,
                stream_mode="messages"
            ):

                if metadata.get("langgraph_node") != "chat_node":
                    continue

                content = message_chunk.content

                if isinstance(content, str) and content:
                    yield sse({
                        "type": "token",
                        "content": content
                    })

            yield sse({
                "type": "done",
                "thread_id": str(request.thread_id)
            })

        except Exception:
            logger.exception("Chat streaming failed")

            yield sse({
                "type": "error",
                "message": "Failed to generate response"
            })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# 6. Health check endpoint
@app.get("/")
def home():
    return {
        "message": "LangGraph Chat API is running"
    }
