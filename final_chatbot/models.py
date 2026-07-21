from typing import Any, Dict, Optional, List

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):

    sessionId: str

    userId: Optional[str] = None

    userProfile: Optional[Dict[str, Any]] = None

    message: str


class PlaceDto(BaseModel):

    placeId: Optional[str] = None

    name: Optional[str] = None

    address: Optional[str] = None

    lat: Optional[float] = None

    lng: Optional[float] = None

    rating: Optional[float] = None

    reviews: Optional[int] = None

    hours: Optional[str] = None

    atmosphere: List[str] = Field(default_factory=list)

    amenities: List[str] = Field(default_factory=list)

    thumbnail: Optional[str] = None

    type: Optional[str] = None

class ChatResponse(BaseModel):

    status: str

    message: str

    places: List[PlaceDto] = Field(default_factory=list)
