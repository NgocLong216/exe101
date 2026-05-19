import json
import os
from typing import Annotated, TypedDict, List, Optional
from pydantic import BaseModel, Field
import requests

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AnyMessage, HumanMessage, AIMessage, SystemMessage, RemoveMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

# Cài đặt API Key (Thay bằng key thật của bạn hoặc dùng file .env)
os.environ["GOOGLE_API_KEY"] = ""
BACKEND_URL = ""
TOKEN = ""

# ==========================================
# 1. ĐỊNH NGHĨA CẤU TRÚC JSON (Pydantic)
# ==========================================
class GpsCoordinates(BaseModel):
	latitude: Optional[float] = None
	longitude: Optional[float] = None

class LocalResult(BaseModel):
	position: Optional[int] = None
	title: Optional[str] = None
	address: Optional[str] = None
	gps_coordinates: Optional[GpsCoordinates] = None
	rating: Optional[float] = None
	type: Optional[str] = None

class SearchParameters(BaseModel):
	q: Optional[str] = Field(None, description="Từ khóa tìm kiếm gốc hoặc được viết lại")
	location: Optional[str] = Field(None, description="Vị trí người dùng muốn tìm kiếm")

class SerpApiResponse(BaseModel):
	search_parameters: Optional[SearchParameters] = None
	local_results: Optional[List[LocalResult]] = Field(default_factory=list)

class AgentExtraction(BaseModel):
	is_clear: bool = Field(description="Yêu cầu của user đã đủ thông tin về địa điểm/dịch vụ chưa?")
	rewritten_query: Optional[str] = Field(description="Viết lại query cho rõ ràng (nếu cần)")
	clarification_question: Optional[str] = Field(description="Câu hỏi để lấy thêm thông tin từ user nếu chưa rõ")
	extracted_json: Optional[SerpApiResponse] = Field(description="Dữ liệu trích xuất dạng SerpApi nếu query đã rõ ràng")

# ==========================================
# 2. ĐỊNH NGHĨA STATE CỦA ĐỒ THỊ (LangGraph)
# ==========================================
class AgentState(TypedDict):
	messages: Annotated[list[AnyMessage], add_messages]
	summary: str
	current_extraction: Optional[AgentExtraction]
	real_api_response: Optional[dict] # <-- THÊM MỚI: Lưu trữ data thật từ API

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)

# ==========================================
# 3. CÁC NODE XỬ LÝ (Nodes)
# ==========================================

def summarize_memory(state: AgentState):
	messages = state["messages"]
	summary = state.get("summary", "")
	
	# 1. Sửa lỗi tối ưu LangGraph: Nếu không cần tóm tắt, trả về {} (không làm gì cả)
	if len(messages) <= 4:
		return {} 
	
	old_messages = messages[:-2]
	prompt = (
		f"Đây là tóm tắt trước đó: {summary}\n\n"
		f"Hãy tóm tắt ngắn gọn các tin nhắn sau để giữ lại context:\n"
		+ "\n".join([f"{m.type}: {m.content}" for m in old_messages])
	)
	
	# 2. Sửa lỗi Gemini: Bắt buộc dùng HumanMessage thay vì SystemMessage 
	# để Gemini không bị lỗi "contents are required"
	response = llm.invoke([HumanMessage(content=prompt)])
	
	# Xóa các tin nhắn cũ
	delete_messages = [RemoveMessage(id=m.id) for m in old_messages if m.id]
	return {"summary": response.content, "messages": delete_messages}

def analyze_and_extract(state: AgentState):
	messages = state["messages"]
	summary = state.get("summary", "")
	user_query = messages[-1].content
	
	structured_llm = llm.with_structured_output(AgentExtraction)
	sys_prompt = f"""Bạn là AI phân tích yêu cầu tìm kiếm địa điểm.
	Ngữ cảnh (Summary): {summary}
	Nhiệm vụ: Trích xuất tham số tìm kiếm. Nếu người dùng chưa cung cấp rõ khu vực hoặc loại địa điểm, hãy set is_clear = false và hỏi lại. KHÔNG BỊA DATA."""
	
	response: AgentExtraction = structured_llm.invoke([
		SystemMessage(content=sys_prompt),
		HumanMessage(content=user_query)
	])
	return {"current_extraction": response}

def fetch_real_data_from_api(state: AgentState):

	extraction = state["current_extraction"]

	if not extraction.is_clear:
		return {"real_api_response": None}

	query = (
		extraction.rewritten_query
		or extraction.extracted_json.search_parameters.q
	)

	# TODO: lấy groupId thật
	group_id = "3d3e9534-ea11-42c6-8569-787fceefe397" # group để test

	print(f"\n[System Log] 🔍 Calling backend for: '{query}'")

	try:

		response = requests.post(
			f"{BACKEND_URL}/api/groups/{group_id}/suggest-place",
			json={
				"keyword": query
			},
			headers={
				"Content-Type": "application/json",
				"Authorization": f"Bearer {TOKEN}"
			},
			timeout=30
		)

		response.raise_for_status()

		data = response.json()

		print("[System Log] ✅ Backend response received")

		return {
			"real_api_response": data
		}

	except Exception as e:

		print(f"[System Log] ❌ API Error: {str(e)}")

		return {
			"real_api_response": {
				"error": str(e),
				"local_results": []
			}
		}

def provide_additional_info(state: AgentState):
	extraction = state["current_extraction"]
	
	# Nếu chưa clear -> Trả về câu hỏi làm rõ
	if not extraction.is_clear:
		return {"messages": [AIMessage(content=extraction.clarification_question)]}
	
	# Lấy data thật từ Node fetch_real_data_from_api
	real_data = state.get("real_api_response", {})
	
	sys_prompt = """Dựa vào dữ liệu THỰC TẾ từ Google Maps dưới đây, 
	hãy trả lời yêu cầu của người dùng một cách thân thiện. 
	Lọc ra các quán phù hợp nhất với yêu cầu (ví dụ: yên tĩnh, wifi...). 
	Nếu có giờ mở cửa hoặc rating, hãy nêu rõ."""
	
	info_response = llm.invoke([
	SystemMessage(content=sys_prompt),
	HumanMessage(
		content=f"""
		User query:
		{extraction.rewritten_query}

		Backend API results:
		{json.dumps(real_data, ensure_ascii=False, indent=2)}
		"""
	)
])
	
	return {"messages": [AIMessage(content=info_response.content)]}

# ==========================================
# 4. ĐỊNH TUYẾN & BUILD GRAPH
# ==========================================
def should_continue(state: AgentState) -> str:
	extraction = state.get("current_extraction")
	if extraction and not extraction.is_clear:
		return "ask_user"
	return "provide_info"

builder = StateGraph(AgentState)

builder.add_node("summarize_memory", summarize_memory)
builder.add_node("analyze_and_extract", analyze_and_extract)
builder.add_node("fetch_real_data_from_api", fetch_real_data_from_api) # Add new node
builder.add_node("provide_additional_info", provide_additional_info)

builder.add_edge(START, "summarize_memory")
builder.add_edge("summarize_memory", "analyze_and_extract")
builder.add_conditional_edges(
	"analyze_and_extract",
	should_continue,
	{
		"ask_user": "provide_additional_info", 
		"provide_info": "fetch_real_data_from_api" # Rẽ sang gọi API
	}
)
builder.add_edge("fetch_real_data_from_api", "provide_additional_info")
builder.add_edge("provide_additional_info", END)

agent_app = builder.compile()

# ==========================================
# 6. CHẾ ĐỘ TRÒ CHUYỆN TƯƠNG TÁC (INTERACTIVE)
# ==========================================
if __name__ == "__main__":
	# Khởi tạo session và state ban đầu
	config = {"configurable": {"thread_id": "interactive_session_1"}}
	state = {"messages": [], "summary": ""}
	
	print("=== TRỢ LÝ AI TÌM KIẾM ĐỊA ĐIỂM ===")
	print("(Gõ 'quit', 'exit' hoặc 'q' để kết thúc trò chuyện)\n")
	
	while True:
		# 1. Chờ người dùng nhập tin nhắn từ bàn phím
		user_input = input("👨‍💻 Bạn: ")
		
		# 2. Xử lý lệnh thoát chương trình
		if user_input.lower() in ['quit', 'exit', 'q']:
			print("👋 Tạm biệt! Hẹn gặp lại.")
			break
			
		# 3. Bỏ qua nếu người dùng lỡ nhấn Enter mà không gõ gì
		if not user_input.strip():
			continue
			
		# 4. Thêm tin nhắn của user vào bộ nhớ và gọi Agent xử lý
		state["messages"].append(HumanMessage(content=user_input))
		
		# Thêm try-except để bắt lỗi nếu API bị lỗi hoặc mất mạng
		try:
			state = agent_app.invoke(state, config)
			
			# 5. In câu trả lời của AI ra màn hình
			print(f"🤖 AI: {state['messages'][-1].content}\n")
			
		except Exception as e:
			print(f"❌ Lỗi hệ thống: {str(e)}\n")