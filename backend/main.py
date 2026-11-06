from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from uuid import UUID

from langchain_core.messages import HumanMessage

from graph import chatbot


# 1. Initialize FastAPI
app = FastAPI(
    title="LangGraph Chat API"
)


# 2. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3. Define request schema
class ChatRequest(BaseModel):
    message: str
    thread_id: UUID


# 4. Define response schema
class ChatResponse(BaseModel):
    answer: str
    thread_id: str


# 5. Create chat endpoint
@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):

    try:
        config = {
            "configurable": {
                "thread_id": str(request.thread_id)
            }
        }

        response = chatbot.invoke(
            {
                "messages": [
                    HumanMessage(content=request.message)
                ]
            },
            config=config
        )

        ai_message = response["messages"][-1]

        return ChatResponse(
            answer=ai_message.content,
            thread_id=str(request.thread_id)
        )

    except Exception as e:
        print(f"Chat error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Something went wrong while generating the response."
        )


# 6. Health check endpoint
@app.get("/")
def home():
    return {
        "message": "LangGraph Chat API is running"
    }
