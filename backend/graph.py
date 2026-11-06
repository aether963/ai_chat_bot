from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage
from dotenv import load_dotenv

load_dotenv()

# 1. Define the graph state


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# 2. Initialize the LLM
model = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7
)


# 3. Define the chatbot node
def chat_node(state: ChatState):
    messages = state["messages"]

    response = model.invoke(messages)

    return {
        "messages": [response]
    }


# 4. Build the graph
builder = StateGraph(ChatState)

builder.add_node("chat_node", chat_node)

builder.add_edge(START, "chat_node")
builder.add_edge("chat_node", END)


# 5. Configure memory
checkpointer = MemorySaver()


# 6. Compile the graph
chatbot = builder.compile(
    checkpointer=checkpointer
)
