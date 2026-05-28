from typing import Optional, List

from pydantic import BaseModel


class ChatRequest(BaseModel):

    sessionId: str

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

    atmosphere: List[str] = []

    amenities: List[str] = []

    thumbnail: Optional[str] = None

    type: Optional[str] = None

class ChatResponse(BaseModel):

    status: str

    message: str

    places: List[PlaceDto] = []