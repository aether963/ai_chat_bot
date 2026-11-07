import json
import logging
import os
from contextlib import asynccontextmanager
from uuid import UUID
from datetime import datetime, timezone
from pydantic import BaseModel, Field
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
        resources["pool"] = pool
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


class CreateChatRequest(BaseModel):
    id: UUID
    title: str = Field(default="New chat", max_length=255)


class ChatRequest(BaseModel):
    message: str
    thread_id: UUID


def sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@app.get("/chats")
async def get_chats():

    pool = resources["pool"]

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, title, created_at, updated_at
                FROM chats
                ORDER BY updated_at DESC
                """
            )

            rows = await cur.fetchall()

    return [
        {
            "id": str(row[0]),
            "title": row[1],
            "created_at": row[2].isoformat(),
            "updated_at": row[3].isoformat()
        }
        for row in rows
    ]


@app.post("/chats")
async def create_chat(request: CreateChatRequest):

    pool = resources["pool"]

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO chats (id, title)
                VALUES (%s, %s)
                RETURNING id, title, created_at, updated_at
                """,
                (request.id, request.title)
            )

            chat = await cur.fetchone()

    return {
        "id": str(chat[0]),
        "title": chat[1],
        "created_at": chat[2].isoformat(),
        "updated_at": chat[3].isoformat()
    }


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
