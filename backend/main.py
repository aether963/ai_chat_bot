import json
import logging
import os
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from psycopg_pool import AsyncConnectionPool
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langchain_core.messages import HumanMessage

from graph import builder

logger = logging.getLogger(__name__)

# Hold shared database resources and compiled graph
resources = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    database_url = os.environ["DATABASE_URL"]

    # Create PostgreSQL connection pool
    pool = AsyncConnectionPool(
        conninfo=database_url,
        max_size=10,
        kwargs={"autocommit": True},
        open=False,
    )

    await pool.open()

    try:
        # Initialize LangGraph PostgreSQL checkpointer
        checkpointer = AsyncPostgresSaver(pool)

        # Create checkpoint tables if they don't exist
        await checkpointer.setup()

        # Compile graph with persistent checkpointing
        chatbot = builder.compile(checkpointer=checkpointer)

        resources["chatbot"] = chatbot

        logger.info("PostgreSQL checkpointing initialized")

        yield

    finally:
        resources.clear()
        await pool.close()


# Initialize FastAPI
app = FastAPI(
    title="LangGraph Chat API",
    lifespan=lifespan
)


# Configure CORS
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


class ChatRequest(BaseModel):
    message: str
    thread_id: UUID


def sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@app.post("/chat")
async def chat(request: ChatRequest):

    chatbot = resources["chatbot"]

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


@app.get("/")
def home():
    return {
        "message": "LangGraph Chat API is running"
    }
