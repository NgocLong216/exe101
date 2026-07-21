import json
import os
import re

from typing import (
    TypedDict,
    Annotated,
    Optional,
    List
)

import requests

from dotenv import load_dotenv

from pydantic import (
    BaseModel,
    Field
)

from langchain_google_genai import (
    ChatGoogleGenerativeAI
)

from langchain_core.messages import (
    AnyMessage,
    HumanMessage,
    AIMessage,
    SystemMessage,
    RemoveMessage
)

from langgraph.graph import (
    StateGraph,
    START,
    END
)

from langgraph.graph.message import (
    add_messages
)

from profile import (
    get_user_profile,
    save_user_profile,
    add_profile_history,
    merge_profile_tags,
    add_liked_place
)

# =====================================================
# ENV
# =====================================================

load_dotenv()

GOOGLE_API_KEY = os.getenv(
    "GOOGLE_API_KEY"
)

SERP_API_KEY = os.getenv(
    "SERP_API_KEY"
)

if GOOGLE_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

# =====================================================
# LLM
# =====================================================

_llm = None


def get_llm():
    global _llm

    if _llm is None:
        _llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0
        )

    return _llm

# =====================================================
# PYDANTIC MODELS
# =====================================================

class GpsCoordinates(BaseModel):

    latitude: Optional[float] = None

    longitude: Optional[float] = None


class LocalResult(BaseModel):

    position: Optional[int] = None

    title: Optional[str] = None

    address: Optional[str] = None

    gps_coordinates: Optional[
        GpsCoordinates
    ] = None

    rating: Optional[float] = None

    type: Optional[str] = None


class SearchParameters(BaseModel):

    q: Optional[str] = None

    location: Optional[str] = None


class SerpApiResponse(BaseModel):

    search_parameters: Optional[
        SearchParameters
    ] = None

    local_results: Optional[
        List[LocalResult]
    ] = Field(default_factory=list)


class AgentExtraction(BaseModel):

    is_clear: bool = Field(
        description="Query đủ rõ chưa"
    )

    rewritten_query: Optional[str] = Field(
        description="Query rewrite"
    )

    clarification_question: Optional[str] = Field(
        description="Câu hỏi hỏi thêm"
    )

    extracted_json: Optional[
        SerpApiResponse
    ] = None


class ProfileExtraction(BaseModel):

    should_update: bool = Field(
        default=False,
        description="Có nên cập nhật profile không"
    )

    tags: List[str] = Field(
        default_factory=list,
        description="Tags sở thích rút trích từ user"
    )

    liked_place: Optional[dict] = Field(
        default=None,
        description="Thông tin địa điểm user muốn lưu"
    )

    update_reason: Optional[str] = Field(
        default=None,
        description="Lý do hoặc context để cập nhật profile"
    )


# =====================================================
# STATE
# =====================================================

class AgentState(TypedDict):

    messages: Annotated[
        list[AnyMessage],
        add_messages
    ]

    summary: str

    current_extraction: Optional[
        AgentExtraction
    ]

    real_api_response: Optional[dict]

    profile_summary: Optional[str]

    last_results: List[dict]


def get_search_query(extraction: AgentExtraction) -> Optional[str]:
    if extraction.rewritten_query:
        return extraction.rewritten_query

    if (
        extraction.extracted_json
        and extraction.extracted_json.search_parameters
    ):
        return extraction.extracted_json.search_parameters.q

    return None


def get_place_type(place: dict) -> str:
    place_types = place.get("types")

    if isinstance(place_types, list):
        return ", ".join(place_types)

    return place.get("type") or ""


def profile_keywords(profile_summary: Optional[str]) -> List[str]:
    if not profile_summary:
        return []

    ignored = {
        "tags",
        "liked",
        "places",
        "khong",
        "không",
        "profile",
        "nguoi",
        "người",
        "dung",
        "dùng"
    }

    words = re.findall(
        r"[\wÀ-ỹ]+",
        profile_summary.lower()
    )

    return [
        word
        for word in words
        if len(word) >= 3 and word not in ignored
    ]


def safe_float(value, default: float = 0.0) -> float:
    try:
        return float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return default


def safe_int(value, default: int = 0) -> int:
    try:
        return int(float(str(value).replace(",", "")))
    except (TypeError, ValueError):
        return default


def compact_place_for_prompt(place: dict) -> dict:
    """
    Input:
        place: dict địa điểm đã được normalize từ SerpAPI hoặc mock data.

    Output:
        dict chỉ giữ các field cần cho LLM viết câu trả lời.

    Mục đích:
        Giảm token prompt. Frontend vẫn nhận place đầy đủ, nhưng LLM không cần
        nhìn các field nặng như thumbnail, lat, lng, placeId.
    """
    return {
        "name": place.get("name"),
        "address": place.get("address"),
        "rating": place.get("rating"),
        "reviews": place.get("reviews"),
        "hours": place.get("hours"),
        "type": place.get("type"),
        "atmosphere": (place.get("atmosphere") or [])[:4],
        "amenities": (place.get("amenities") or [])[:4]
    }


def compact_places_for_prompt(
        places: Optional[List[dict]],
        limit: int = 3
) -> List[dict]:
    """
    Input:
        places: danh sách địa điểm đầy đủ.
        limit: số địa điểm tối đa gửi vào prompt.

    Output:
        List[dict] đã compact bằng compact_place_for_prompt().

    Mục đích:
        Chỉ gửi top N địa điểm vào LLM để tiết kiệm token. Các địa điểm còn lại
        vẫn có thể được trả về API response nếu cần render ở UI.
    """
    return [
        compact_place_for_prompt(place)
        for place in (places or [])[:limit]
    ]


def compact_json(data: dict) -> str:
    """
    Input:
        data: dict bất kỳ cần nhúng vào prompt.

    Output:
        JSON string không indent và không escape tiếng Việt.

    Mục đích:
        Dùng separators=(',', ':') để giảm token so với json.dumps(..., indent=2).
    """
    return json.dumps(
        data,
        ensure_ascii=False,
        separators=(",", ":")
    )


def short_profile_summary(profile_summary: Optional[str]) -> str:
    """
    Input:
        profile_summary: text profile đã build từ profiles.json.

    Output:
        Chuỗi profile ngắn, tối đa vài dòng đầu.

    Mục đích:
        Không đưa toàn bộ lịch sử dài vào prompt. LLM chỉ cần sở thích/chỗ đã
        thích gần nhất để cá nhân hóa câu trả lời.
    """
    if not profile_summary:
        return "Không có profile người dùng"

    lines = [
        line.strip()
        for line in profile_summary.splitlines()
        if line.strip()
    ]

    return "\n".join(lines[:8]) or "Không có profile người dùng"


def normalize_user_text(text: str) -> str:
    """
    Input:
        text: câu user nhập, có thể bắt đầu bằng @bot.

    Output:
        Text đã bỏ @bot và normalize khoảng trắng.

    Mục đích:
        Chuẩn hóa trước khi rule-based extraction tìm category/location.
    """
    return re.sub(
        r"\s+",
        " ",
        text.replace("@bot", " ")
    ).strip()


CATEGORY_PATTERNS = [
    ("quán cà phê", r"\b(cà phê|ca phe|cafe|coffee)\b"),
    ("quán nướng", r"\b(quán nướng|quan nuong|đồ nướng|do nuong|bbq|lẩu nướng|lau nuong)\b"),
    ("buffet", r"\bbuffet\b"),
    ("nhà hàng nhật", r"\b(đồ nhật|do nhat|nhật bản|nhat ban|sushi|izakaya|japanese)\b"),
    ("nhà hàng", r"\b(nhà hàng|nha hang|restaurant)\b"),
    ("quán ăn", r"\b(quán ăn|quan an|đồ ăn|do an|ăn uống|an uong)\b")
]


LOCATION_PATTERNS = [
    ("vincom mega mall grand park", r"\b(vincom mega mall|grand park|88 phước thiện)\b"),
    ("trung tâm sài gòn", r"\b(trung tâm sài gòn|trung tam sai gon|trung tâm saigon|trung tam saigon|gần trung tâm|gan trung tam)\b"),
    ("thủ đức", r"\b(thủ đức|thu duc)\b"),
    ("quận 1", r"\b(q\.?\s*1|quận\s*1|quan\s*1|district\s*1)\b"),
    ("quận 3", r"\b(q\.?\s*3|quận\s*3|quan\s*3|district\s*3)\b"),
    ("quận 7", r"\b(q\.?\s*7|quận\s*7|quan\s*7|district\s*7)\b"),
    ("hồ chí minh", r"\b(hồ chí minh|ho chi minh|hcm|tp\.?\s*hcm|sài gòn|sai gon|saigon)\b")
]


PREFERENCE_PATTERNS = [
    ("wifi", r"\b(wifi|wi-fi|wi fi)\b"),
    ("ấm cúng", r"\b(ấm cúng|am cung|cozy|cosy)\b"),
    ("yên tĩnh", r"\b(yên tĩnh|yen tinh|quiet)\b"),
    ("lãng mạn", r"\b(lãng mạn|lang man|romantic)\b"),
    ("sang trọng", r"\b(sang trọng|sang trong|upscale)\b"),
    ("hợp xu hướng", r"\b(hợp xu hướng|hop xu huong|trendy|trending)\b"),
    ("thoải mái", r"\b(thoải mái|thoai mai|casual)\b"),
    ("rating cao", r"\b(rating cao|đánh giá cao|danh gia cao|review cao)\b"),
    ("nhiều đánh giá", r"\b(nhiều đánh giá|nhieu danh gia|nhiều review|nhieu review)\b"),
    ("giá phải chăng", r"\b(giá rẻ|gia re|giá phải chăng|gia phai chang|bình dân|binh dan)\b")
]


def extract_pattern_labels(text: str, patterns: List[tuple[str, str]]) -> List[str]:
    """
    Input:
        text: câu cần phân tích.
        patterns: list tuple (label, regex), ví dụ ('quán cà phê', pattern).

    Output:
        Danh sách label match với text.

    Mục đích:
        Tách các yếu tố có cấu trúc nhẹ như loại địa điểm, khu vực, preference
        mà không cần gọi LLM.
    """
    lowered = text.lower()

    return [
        label
        for label, pattern in patterns
        if re.search(pattern, lowered)
    ]


def extract_recent_locations(messages: List[AnyMessage]) -> List[str]:
    """
    Input:
        messages: các message gần đây trong session hiện tại.

    Output:
        Danh sách location tìm được từ các human message trước đó.

    Mục đích:
        Cho phép hội thoại nhiều bước. Ví dụ user hỏi "quán cà phê", bot hỏi
        "khu vực nào?", user trả "quận 1" thì code vẫn có thể tận dụng context.
    """
    recent_text = " ".join(
        str(message.content)
        for message in messages[-4:]
        if getattr(message, "type", "") == "human"
    )

    return extract_pattern_labels(
        recent_text,
        LOCATION_PATTERNS
    )


def build_serp_search_query(
        user_message: str,
        messages: List[AnyMessage]
) -> tuple[Optional[str], Optional[str]]:
    """
    Input:
        user_message: câu hiện tại của user.
        messages: toàn bộ message trong session, dùng để lấy context gần đây.

    Output:
        tuple(search_query, clarification_question)
        - search_query: query rộng gửi cho SerpAPI, dạng "category + location".
        - clarification_question: câu hỏi lại user nếu thiếu thông tin.

    Mục đích:
        Tối ưu search với SerpAPI Google Maps. Không nhồi các preference mềm
        như "ấm cúng", "wifi", "rating cao" vào q, vì SerpAPI search tốt hơn
        khi q rộng: "quán cà phê quận 1". Preference sẽ dùng để rank sau.
    """
    cleaned = normalize_user_text(user_message)
    categories = extract_pattern_labels(
        cleaned,
        CATEGORY_PATTERNS
    )

    if not categories:
        return None, None

    locations = extract_pattern_labels(
        cleaned,
        LOCATION_PATTERNS
    )

    if not locations:
        locations = extract_recent_locations(
            messages[:-1]
        )

    if not locations:
        return None, "Bạn muốn tìm ở khu vực nào?"

    return " ".join([
        categories[0],
        locations[0]
    ]), None


def current_preference_keywords(user_message: str) -> List[str]:
    """
    Input:
        user_message: câu hiện tại của user.

    Output:
        Danh sách preference mềm, ví dụ ['wifi', 'ấm cúng'].

    Mục đích:
        Các preference này không dùng làm q chính cho SerpAPI mà dùng ở
        rank_places() để cộng điểm cho địa điểm phù hợp.
    """
    return extract_pattern_labels(
        user_message,
        PREFERENCE_PATTERNS
    )


def preference_matches_place_text(
        preference: str,
        place_text: str
) -> bool:
    """
    Input:
        preference: label chuẩn hóa, ví dụ 'ấm cúng'.
        place_text: text ghép từ name/address/type/amenities/atmosphere.

    Output:
        True nếu place_text match preference.

    Mục đích:
        Match đa ngôn ngữ. Ví dụ user nói "ấm cúng" nhưng SerpAPI trả
        atmosphere là "Cozy" hoặc "Cosy" thì vẫn tính là match.
    """
    for label, pattern in PREFERENCE_PATTERNS:
        if label == preference:
            return bool(re.search(pattern, place_text.lower()))

    return preference in place_text.lower()


def quick_search_extraction(
        user_message: str,
        messages: List[AnyMessage]
) -> Optional[AgentExtraction]:
    """
    Input:
        user_message: câu hiện tại của user.
        messages: context session.

    Output:
        AgentExtraction nếu rule đủ tự tin:
        - is_clear=True và rewritten_query nếu đã có category + location.
        - is_clear=False và clarification_question nếu thiếu location.
        None nếu rule không hiểu, để fallback sang LLM analyze.

    Mục đích:
        Giảm token bằng cách bỏ qua LLM analyze với các câu rõ ràng như
        "@bot quán cà phê quận 1".
    """
    search_query, clarification_question = build_serp_search_query(
        user_message,
        messages
    )

    if clarification_question:
        return AgentExtraction(
            is_clear=False,
            rewritten_query=None,
            clarification_question=clarification_question,
            extracted_json=None
        )

    if not search_query:
        return None

    return AgentExtraction(
        is_clear=True,
        rewritten_query=search_query,
        clarification_question=None,
        extracted_json=None
    )


def should_extract_profile(
        user_message: str,
        last_results: Optional[List[dict]]
) -> bool:
    """
    Input:
        user_message: câu hiện tại của user.
        last_results: danh sách địa điểm bot vừa gợi ý ở lượt trước.

    Output:
        True nếu nên gọi LLM để cập nhật profile, False nếu bỏ qua.

    Mục đích:
        Tránh gọi LLM profile extraction ở mọi message. Chỉ cập nhật khi user
        có tín hiệu rõ như "lưu", "chọn số 2", "mình thích yên tĩnh".
    """
    lowered = user_message.lower()

    explicit_signals = [
        "lưu",
        "save",
        "thích",
        "chọn",
        "chốt",
        "đi quán",
        "địa điểm này",
        "quán này",
        "số ",
        "số 1",
        "số 2",
        "số 3",
        "thứ 1",
        "thứ 2",
        "thứ 3",
        "đầu tiên"
    ]

    preference_signals = [
        "tôi thích",
        "mình thích",
        "gu",
        "ưu tiên",
        "có wifi",
        "yên tĩnh",
        "ấm cúng",
        "lãng mạn",
        "sang trọng",
        "giá rẻ",
        "rating cao"
    ]

    if any(signal in lowered for signal in explicit_signals):
        return bool(last_results)

    return any(signal in lowered for signal in preference_signals)


def rank_places(
        places: List[dict],
        profile_summary: Optional[str],
        user_message: Optional[str] = None
) -> List[dict]:
    """
    Input:
        places: danh sách địa điểm đã normalize từ SerpAPI hoặc mock data.
        profile_summary: sở thích/lịch sử user ở dạng text ngắn.
        user_message: câu hỏi hiện tại, dùng để lấy preference tức thời.

    Output:
        Danh sách places đã sort theo điểm phù hợp giảm dần.

    Mục đích:
        Cá nhân hóa kết quả sau khi đã search rộng. Công thức điểm hiện tại:
        rating + review_score + profile_match_score + current_preference_score.
        Nhờ vậy q vẫn rộng nhưng kết quả ưu tiên đúng nhu cầu như wifi/ấm cúng.
    """
    keywords = profile_keywords(profile_summary)
    current_keywords = current_preference_keywords(
        user_message or ""
    )

    def score(place: dict) -> float:
        rating = safe_float(place.get("rating"))
        reviews = safe_int(place.get("reviews"))
        text = " ".join([
            str(place.get("name") or ""),
            str(place.get("address") or ""),
            str(place.get("type") or ""),
            " ".join(place.get("atmosphere") or []),
            " ".join(place.get("amenities") or [])
        ]).lower()

        preference_score = sum(
            0.35
            for keyword in keywords
            if keyword in text
        )

        current_preference_score = sum(
            0.9
            for keyword in current_keywords
            if preference_matches_place_text(keyword, text)
        )

        review_score = min(reviews / 1000, 1.5)

        return rating + review_score + preference_score + current_preference_score

    return sorted(
        places,
        key=score,
        reverse=True
    )


def place_reference_index(user_message: str) -> Optional[int]:
    lowered = user_message.lower()
    patterns = {
        0: ["quán đầu", "địa điểm đầu", "place đầu", "first", "số 1", "thứ 1"],
        1: ["quán thứ 2", "địa điểm thứ 2", "place thứ 2", "second", "số 2"],
        2: ["quán thứ 3", "địa điểm thứ 3", "place thứ 3", "third", "số 3"]
    }

    for index, phrases in patterns.items():
        if any(phrase in lowered for phrase in phrases):
            return index

    match = re.search(r"\b(?:so|số|thu|thứ)\s*(\d+)\b", lowered)
    if match:
        return int(match.group(1)) - 1

    return None


def resolve_liked_place_reference(
        user_message: str,
        liked_place: Optional[dict],
        last_results: Optional[List[dict]]
) -> Optional[dict]:
    if not last_results:
        return liked_place

    index = place_reference_index(user_message)
    if index is None or index < 0 or index >= len(last_results):
        return liked_place

    selected = dict(last_results[index])
    if liked_place and liked_place.get("reason"):
        selected["reason"] = liked_place.get("reason")

    return selected


# =====================================================
# MEMORY SUMMARY
# =====================================================

def summarize_memory(state: AgentState):

    messages = state["messages"]

    summary = state.get(
        "summary",
        ""
    )

    if len(messages) <= 6:
        return {}

    old_messages = messages[:-2]

    prompt = f"""
    Đây là summary cũ:
    {summary}

    Hãy tóm tắt ngắn gọn
    conversation dưới đây:

    {
        chr(10).join(
            [
                f"{m.type}: {m.content}"
                for m in old_messages
            ]
        )
    }
    """

    response = get_llm().invoke([
        HumanMessage(content=prompt)
    ])

    delete_messages = [

        RemoveMessage(id=m.id)

        for m in old_messages

        if m.id
    ]

    return {
        "summary": response.content,
        "messages": delete_messages
    }


# =====================================================
# ANALYZE USER QUERY
# =====================================================

def analyze_and_extract(state: AgentState):

    messages = state["messages"]

    user_query = messages[-1].content

    quick_extraction = quick_search_extraction(
        user_query,
        messages
    )

    if quick_extraction:
        return {
            "current_extraction": quick_extraction
        }

    summary = state.get(
        "summary",
        ""
    )

    profile_summary = state.get(
        "profile_summary",
        "Không có profile người dùng"
    )

    last_results = state.get(
        "last_results",
        []
    )

    recent_context = "\n".join(
        [f"{m.type}: {m.content}" for m in messages[-4:]]
    )

    structured_llm = get_llm().with_structured_output(
        AgentExtraction
    )

    sys_prompt = """
    Bạn là AI recommend địa điểm.

    Hãy phân tích yêu cầu của người dùng và xác định xem câu hỏi đã đủ rõ để tìm địa điểm Google Maps chưa.

    Nếu chưa đủ rõ, hãy trả về is_clear = false và đưa ra clarification_question cụ thể để hỏi thêm.
    Nếu đủ rõ, hãy trả về is_clear = true và rewritten_query là một phiên bản query ngắn gọn, rõ ràng, phù hợp để tìm kiếm địa điểm bằng SerpAPI Google Maps.

    Quy tắc rewrite query:
    - rewritten_query chỉ nên gồm loại địa điểm chính + khu vực chính.
    - Không nhồi các sở thích mềm như "ấm cúng", "yên tĩnh", "wifi", "rating cao", "giá rẻ" vào rewritten_query trừ khi đó là loại địa điểm cốt lõi.
    - Ví dụ: "quán cà phê ấm cúng có wifi ở quận 1" -> "quán cà phê quận 1".
    - Ví dụ: "nhà hàng Nhật lãng mạn gần trung tâm Sài Gòn" -> "nhà hàng Nhật trung tâm Sài Gòn".

    Mục tiêu:
    - hiểu chính xác ý định user
    - giữ ngữ cảnh hội thoại hiện tại
    - tận dụng profile sở thích nếu user nhắc tới "gu của mình", "như lần trước", hoặc yêu cầu cá nhân hóa
    - không thêm dữ liệu không có thật

    Format trả về phải đúng schema AgentExtraction.
    """

    response: AgentExtraction = (
        structured_llm.invoke([

            SystemMessage(
                content=sys_prompt
            ),

            HumanMessage(
                content=f"""
                Existing summary:
                {summary or 'Không có summary cũ.'}

                User profile:
                {profile_summary}

                Last recommended places:
                {compact_json(compact_places_for_prompt(last_results, 3))}

                Recent conversation:
                {recent_context}

                Current user request:
                {user_query}
                """
            )
        ])
    )

    return {
        "current_extraction": response
    }


# =====================================================
# FETCH SERPAPI
# =====================================================

def fetch_real_data_from_api(
        state: AgentState
):

    extraction = state[
        "current_extraction"
    ]

    if not extraction.is_clear:

        return {
            "real_api_response": None
        }

    query = get_search_query(
        extraction
    )

    if not query:
        return {
            "real_api_response": {
                "error": "Missing search query",
                "local_results": []
            },
            "last_results": []
        }

    if not SERP_API_KEY:
        return {
            "real_api_response": {
                "error": "Missing SERP_API_KEY",
                "local_results": []
            },
            "last_results": []
        }

    print(f"\n🔍 SEARCH: {query}")

    try:

        url = (
            "https://serpapi.com/search.json"
        )

        params = {
            "engine": "google_maps",
            "q": query,
            "api_key": SERP_API_KEY
        }

        response = requests.get(
            url,
            params=params,
            timeout=30
        )

        response.raise_for_status()

        root = response.json()

        results = root.get(
            "local_results"
        )

        if results is None:

            single = root.get(
                "place_results"
            )

            if single:
                results = [single]

        if results is None:
            results = []

        places = []

        for p in results:

            gps = p.get(
                "gps_coordinates"
            )

            if not gps:
                continue

            lat = gps.get(
                "latitude"
            )

            lng = gps.get(
                "longitude"
            )

            if lat is None or lng is None:
                continue

            atmosphere = []
            amenities = []

            extensions = p.get(
                "extensions",
                []
            )

            if isinstance(
                    extensions,
                    list
            ):

                for ext in extensions:

                    if not isinstance(
                            ext,
                            dict
                    ):
                        continue

                    for key, value in ext.items():

                        if not isinstance(
                                value,
                                list
                        ):
                            continue

                        if key == "atmosphere":
                            atmosphere.extend(
                                value
                            )

                        elif key == "amenities":
                            amenities.extend(
                                value
                            )

            places.append({

			    "placeId":
			        p.get("place_id"),

			    "name":
			        p.get("title"),

			    "address":
			        p.get("address"),

			    "lat":
			        lat,

			    "lng":
			        lng,

			    "rating":
			        safe_float(p.get("rating")),

			    "reviews":
			        safe_int(p.get("reviews")),

			    "hours":
			        p.get("hours", ""),

			    "atmosphere":
			        atmosphere,

			    "amenities":
			        amenities,

			    "thumbnail":
			        p.get("thumbnail"),

			    "type":
				    get_place_type(p)
			})

        places = rank_places(
            places,
            state.get("profile_summary"),
            state["messages"][-1].content
        )[:5]

        print(
            f"✅ FOUND {len(places)}"
        )

        return {
            "real_api_response": {
                "search_query": query,
                "local_results": places
            },
            "last_results": places
        }

    except Exception as e:

        print(f"❌ ERROR: {str(e)}")

        return {
            "real_api_response": {
                "error": str(e),
                "local_results": []
            },
            "last_results": []
        }


# =====================================================
# FINAL RESPONSE
# =====================================================

def provide_additional_info(
        state: AgentState
):

    extraction = state[
        "current_extraction"
    ]

    # NEED MORE INFO

    if not extraction.is_clear:

        question = (
            extraction
            .clarification_question
            or
            "Mình cần thêm thông tin để tìm địa điểm phù hợp. Bạn có thể cho biết rõ hơn về loại địa điểm, khu vực hoặc mục đích sử dụng không?"
        )

        return {
            "messages": [
                AIMessage(content=question)
            ]
        }

    # FINAL AI RESPONSE

    real_data = state.get(
        "real_api_response",
        {}
    ) or {}

    user_query = state["messages"][-1].content

    profile_summary = state.get(
        "profile_summary",
        "Không có profile người dùng"
    )

    search_query = get_search_query(
        extraction
    )

    if not real_data.get("local_results"):
        no_result_text = (
            f"Mình đã tìm kiếm với yêu cầu: \"{search_query}\" nhưng hiện tại chưa tìm được địa điểm phù hợp từ Google Maps. "
            "Bạn có thể thử lại với thêm thông tin về khu vực, loại địa điểm, hoặc ưu tiên rating/giá cả."   
        )
        return {
            "messages": [
                AIMessage(content=no_result_text)
            ]
        }

    sys_prompt = """
    Bạn là AI recommend địa điểm.

    Dựa trên dữ liệu Google Maps thật, hãy tổng hợp một câu trả lời rõ ràng và hữu ích cho người dùng.

    Hãy trình bày:
    1. Tóm tắt yêu cầu của user.
    2. Nêu ít nhất 2-3 địa điểm đề xuất, mỗi địa điểm gồm tên, địa chỉ, rating và lý do phù hợp.
    3. Nếu profile có sở thích liên quan, giải thích ngắn gọn vì sao địa điểm hợp với sở thích đó.
    4. Nếu dữ liệu thiếu, hãy thông báo rõ và đề nghị user bổ sung thông tin.

    Không bịa dữ liệu.
    """

    prompt_data = {
        "search_query": real_data.get("search_query"),
        "user_preferences": current_preference_keywords(user_query),
        "local_results": compact_places_for_prompt(
            real_data.get("local_results"),
            3
        )
    }

    ai_response = get_llm().invoke([

        SystemMessage(
            content=sys_prompt
        ),

        HumanMessage(
            content=f"""
            Original user request:
            {user_query}

            User profile:
            {short_profile_summary(profile_summary)}

            Search query: {search_query}

            Google Maps data:
            {compact_json(prompt_data)}
            """
        )
    ])

    return {
        "messages": [
            AIMessage(
                content=ai_response.content
            )
        ]
    }


# =====================================================
# ROUTER
# =====================================================

def should_continue(state: AgentState):

    extraction = state.get(
        "current_extraction"
    )

    if extraction and not extraction.is_clear:
        return "ask_user"

    return "search"


# =====================================================
# BUILD GRAPH
# =====================================================

builder = StateGraph(
    AgentState
)

builder.add_node(
    "summarize_memory",
    summarize_memory
)

builder.add_node(
    "analyze_and_extract",
    analyze_and_extract
)

builder.add_node(
    "fetch_real_data_from_api",
    fetch_real_data_from_api
)

builder.add_node(
    "provide_additional_info",
    provide_additional_info
)

builder.add_edge(
    START,
    "summarize_memory"
)

builder.add_edge(
    "summarize_memory",
    "analyze_and_extract"
)

builder.add_conditional_edges(
    "analyze_and_extract",
    should_continue,
    {
        "ask_user":
            "provide_additional_info",

        "search":
            "fetch_real_data_from_api"
    }
)

builder.add_edge(
    "fetch_real_data_from_api",
    "provide_additional_info"
)

builder.add_edge(
    "provide_additional_info",
    END
)

agent_app = builder.compile()

# =====================================================
# MAIN FUNCTION
# =====================================================

def extract_profile_signals(
        user_message: str,
        last_results: Optional[List[dict]] = None
) -> ProfileExtraction:

    structured_llm = get_llm().with_structured_output(
        ProfileExtraction
    )

    sys_prompt = """
    Bạn là một bộ phận xử lý profile người dùng.

    Hãy đọc yêu cầu của user và xác định liệu thông tin này có thể được thêm vào profile hay không.
    Trả về:
    - should_update: true nếu cần cập nhật profile
    - tags: danh sách tag sở thích
    - liked_place: thông tin địa điểm user muốn lưu lại nếu có
    - update_reason: ngắn gọn lý do hoặc context

    Nếu user muốn lưu một địa điểm bằng cách nói "quán thứ 2", "địa điểm đầu tiên", "số 3",
    hãy dùng danh sách Last recommended places để điền liked_place bằng đúng địa điểm đó.

    Nếu user chỉ hỏi hoặc đang phân vân mà không ra tín hiệu sở thích mới, trả should_update = false.
    """

    response: ProfileExtraction = (
        structured_llm.invoke([
            SystemMessage(content=sys_prompt),
            HumanMessage(content=f"""
            User message:
            {user_message}

            Last recommended places:
            {compact_json(compact_places_for_prompt(last_results, 3))}
            """)
        ])
    )

    response.liked_place = resolve_liked_place_reference(
        user_message,
        response.liked_place,
        last_results
    )

    return response


def profile_summary_text(profile: dict) -> str:
    tags = profile.get("tags", [])
    liked_places = profile.get("liked_places", [])
    lines = []

    if tags:
        lines.append("Tags:")
        lines.extend([f"- {tag}" for tag in tags])

    if liked_places:
        lines.append("Liked places:")
        for place in liked_places[:3]:
            place_name = place.get("name") or "Không tên"
            reason = place.get("reason") or ""
            lines.append(f"- {place_name}{' (' + reason + ')' if reason else ''}")

    return "\n".join(lines) if lines else "Không có profile người dùng"


def update_profile_with_extraction(
        profile: dict,
        extraction: ProfileExtraction,
        user_message: str
):
    if not extraction.should_update:
        return

    if extraction.tags:
        merge_profile_tags(profile, extraction.tags)

    if extraction.liked_place:
        add_liked_place(profile, extraction.liked_place)

    if extraction.update_reason:
        add_profile_history(profile, extraction.update_reason, "preference")
    else:
        add_profile_history(profile, user_message, "interaction")

    save_user_profile(profile)


def run_agent(
        current_state: dict,
        user_message: str,
        user_id: str
):

    profile = get_user_profile(user_id)
    current_state["profile_summary"] = profile_summary_text(profile)
    current_state.setdefault("last_results", [])

    state = current_state

    state["messages"].append(
        HumanMessage(
            content=user_message
        )
    )

    state = agent_app.invoke(state)

    last_message = (
        state["messages"][-1].content
    )

    extraction = state.get(
        "current_extraction"
    )

    try:
        last_results = state.get("last_results", [])
        if (
            (GOOGLE_API_KEY or os.getenv("GEMINI_API_KEY"))
            and should_extract_profile(user_message, last_results)
        ):
            profile_extraction = extract_profile_signals(
                user_message,
                last_results
            )
            update_profile_with_extraction(
                profile,
                profile_extraction,
                user_message
            )
    except Exception as e:
        print(f"⚠️ PROFILE UPDATE ERROR: {str(e)}")

    # NEED MORE INFO

    if extraction and not extraction.is_clear:

        response = {
            "status":
                "NEED_MORE_INFO",

            "message":
                last_message,

            "places": []
        }

        return response, state

    # COMPLETED

    real_data = state.get(
        "real_api_response",
        {}
    )

    response = {
        "status":
            "COMPLETED",

        "message":
            last_message,

        "places":
            real_data.get(
                "local_results",
                []
            )
    }

    return response, state
