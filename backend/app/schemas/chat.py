from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., max_length=20)
    content: str = Field(..., min_length=1, max_length=4000)


class ChatIn(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=36)
    messages: list[ChatMessage]


class ChatOut(BaseModel):
    reply: str
    disclaimer: str = (
        "AURA-Nutri provides food intelligence, not medical advice. Always consult a "
        "qualified physician or registered dietitian before changing your diet or taking "
        "supplements."
    )
