import json
import os

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

os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

# =====================================================
# LLM
# =====================================================

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)

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
    ] = []


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

    response = llm.invoke([
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

    summary = state.get(
        "summary",
        ""
    )

    user_query = messages[-1].content

    structured_llm = llm.with_structured_output(
        AgentExtraction
    )

    sys_prompt = """
    Bạn là AI recommend địa điểm.

    Dựa trên dữ liệu Google Maps thật,
    hãy đề xuất địa điểm phù hợp nhất với nhu cầu người dùng.

    Địa điểm có thể là:
    - quán cafe
    - nhà hàng
    - khách sạn
    - bệnh viện
    - trường học
    - siêu thị
    - công viên
    - trạm xăng
    - hoặc bất kỳ loại địa điểm nào khác.

    Ưu tiên:
    - đúng nhu cầu người dùng
    - rating cao
    - đánh giá tốt
    - tiện ích phù hợp

    Không bịa dữ liệu.
    Chỉ sử dụng dữ liệu được cung cấp.
    """

    response: AgentExtraction = (
        structured_llm.invoke([

            SystemMessage(
                content=sys_prompt
            ),

            HumanMessage(
                content=user_query
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

    query = (
        extraction.rewritten_query
        or extraction.extracted_json
            .search_parameters.q
    )

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
        results = sorted(
            results,
            key=lambda x: x.get("rating", 0),
            reverse=True
        )[:5]

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
			        p.get("rating", 0),

			    "reviews":
			        p.get("reviews", 0),

			    "hours":
			        p.get("hours", ""),

			    "atmosphere":
			        atmosphere,

			    "amenities":
			        amenities,

			    "thumbnail":
			        p.get("thumbnail"),

			    "type":
				    ", ".join(
				        p.get("types", [])
				    )
			})

        print(
            f"✅ FOUND {len(places)}"
        )

        return {
            "real_api_response": {
                "search_query": query,
                "local_results": places
            }
        }

    except Exception as e:

        print(f"❌ ERROR: {str(e)}")

        return {
            "real_api_response": {
                "error": str(e),
                "local_results": []
            }
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
            "Bạn có thể nói rõ hơn không?"
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
    )

    sys_prompt = """
    Bạn là AI recommend địa điểm.

    Dựa trên dữ liệu Google Maps thật,
    hãy recommend địa điểm phù hợp nhất.

    Ưu tiên:
    - rating cao
    - đúng nhu cầu user
    - atmosphere
    - amenities

    Không bịa data.
    """

    ai_response = llm.invoke([

        SystemMessage(
            content=sys_prompt
        ),

        HumanMessage(
            content=f"""
            User query:
            {extraction.rewritten_query}

            Google Maps data:
            {
                json.dumps(
                    real_data,
                    ensure_ascii=False,
                    indent=2
                )
            }
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

def run_agent(
        current_state: dict,
        user_message: str
):

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