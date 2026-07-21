from fastapi import FastAPI

from models import (
    ChatRequest,
    ChatResponse
)

from memory import sessions

from agent import run_agent

app = FastAPI()

@app.get("/")
def health():
    return {"status": "ok"}

@app.post(
    "/chat",
    response_model=ChatResponse
)
def chat(req: ChatRequest):

    session_id = req.sessionId
    user_id = req.userId or session_id

    if session_id not in sessions:

        sessions[session_id] = {

            "messages": [],

            "summary": "",

            "last_results": []
        }

    state = sessions[session_id]

    response, new_state = run_agent(
        state,
        req.message,
        user_id
    )

    sessions[session_id] = new_state

    return response
