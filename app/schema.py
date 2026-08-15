from typing import Optional

from pydantic import BaseModel


class LocationRequest(BaseModel):
    latitude: float
    longitude: float
    lang: str = "en"


class MinistrySearchRequest(BaseModel):
    name: Optional[str] = None
    lang: str = "en"

class UpdateMemberRequest(BaseModel):
    table_to_update: str
    name_field_to_update: str
    constituency_key: str
    field_to_update: str

class UpdateMinistryRequest(BaseModel):
    name_field_to_update: str
    ministry_name: str
    field_to_update: str

class GetMinisterRequest(BaseModel):
    name: str
    ministry: str
    lang: str = "en"

class GetMpRequest(BaseModel):
    name: Optional[str] = None
    id: Optional[int] = None
    lang: str = "en"
    constituency_key: Optional[str] = None

class GetMpTimelineRequest(BaseModel):
    id: int
    lang: str = "en"

class GetCmRequest(BaseModel):
    state_key: Optional[str] = None
    lang: str = "en"

class UpdateCmRequest(BaseModel):
    name_field_to_update: str
    state_key: str
    field_to_update: str

class TweetRequest(BaseModel):
    name: str
    table: str

class FeedbackRequest(BaseModel):
    reaction: str
    message: str

class GetAssetsRequest(BaseModel):
    name: str
    designation: str
    party: str
    lang: str = "en"

class GetMpPerformanceRequest(BaseModel):
    id: int
    lang: str = "en"


class GetMpPerformanceListRequest(BaseModel):
    """Paged sub-lists of a performance section: works, questions, debates.

    `status` filters MPLADS works to completed / ongoing / pending, and
    `question_type` to starred / unstarred; both are ignored by the endpoints
    they do not apply to.
    """

    id: int
    lang: str = "en"
    page: int = 1
    page_size: int = 20
    status: Optional[str] = None
    question_type: Optional[str] = None
