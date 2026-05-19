# 📖 Giải Thích Code Chatbot Tìm Kiếm Địa Điểm

## 🎯 Tổng Quan
Code này xây dựng một **chatbot AI thông minh** tìm kiếm địa điểm (quán cà phê, nhà hàng...) dùng:
- **LangChain** - Framework cho LLM (Large Language Models)
- **LangGraph** - Tạo workflow theo dạng đồ thị (Graph)
- **Google Generative AI (Gemini)** - Model AI xử lý ngôn ngữ

---

## 📁 Cấu Trúc Code

### **Phần 1: Import & Setup API Key**
```python
os.environ["GOOGLE_API_KEY"] = ""
```
- Cài đặt API Key của Google để gọi Gemini AI
- Cần thay bằng key thật hoặc đọc từ file `.env`

---

## 🏗️ Các Thành Phần Chính

### **1. Định Nghĩa Cấu Trúc Dữ Liệu (Pydantic Models)**

#### `GpsCoordinates`
```python
class GpsCoordinates(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
```
- Lưu tọa độ GPS (vĩ độ, kinh độ)
- `Optional` = có thể là None (không bắt buộc)

#### `LocalResult`
```python
class LocalResult(BaseModel):
    title: Optional[str] = None          # Tên địa điểm
    address: Optional[str] = None        # Địa chỉ
    rating: Optional[float] = None       # Đánh giá sao
    gps_coordinates: Optional[GpsCoordinates] = None
```
- Mô tả một địa điểm tìm được (quán cà phê, nhà hàng...)

#### `SearchParameters`
```python
class SearchParameters(BaseModel):
    q: Optional[str] = None              # Từ khóa tìm kiếm
    location: Optional[str] = None       # Vị trí
```
- Lưu các tham số tìm kiếm

#### `AgentExtraction`
```python
class AgentExtraction(BaseModel):
    is_clear: bool                       # Yêu cầu đã rõ ràng chưa?
    rewritten_query: Optional[str]       # Query được viết lại
    clarification_question: Optional[str] # Câu hỏi để hỏi lại user
    extracted_json: Optional[SerpApiResponse] # Dữ liệu trích xuất
```
- Kết quả phân tích yêu cầu của user bởi AI

#### `AgentState`
```python
class AgentState(TypedDict):
    messages: list[AnyMessage]           # Lịch sử chat
    summary: str                         # Tóm tắt context
    current_extraction: Optional[AgentExtraction]  # Phân tích hiện tại
    real_api_response: Optional[dict]    # Data từ API
```
- State (trạng thái) của toàn bộ agent
- Lưu trữ dữ liệu toàn cục trong quá trình xử lý

---

### **2. Các Node Xử Lý (Processing Nodes)**

Mỗi node là một hàm xử lý một bước trong workflow.

#### **Node 1: `summarize_memory()`**
```
Công dụng: Tóm tắt lịch sử chat để giữ context
```
**Logic:**
1. Kiểm tra nếu messages ≤ 4 → **Không cần tóm tắt**, trả về rỗng
2. Nếu > 4 → Lấy các tin nhắn cũ (trừ 2 tin nhắn gần nhất)
3. Gọi AI tóm tắt các tin nhắn cũ → `summary` mới
4. Xóa các tin nhắn cũ khỏi state
5. Giữ lại 2 tin nhắn mới nhất (còn tươi)

**Tác dụng:** Tránh context quá dài, giảm chi phí API

---

#### **Node 2: `analyze_and_extract()`**
```
Công dụng: Phân tích yêu cầu của user bằng AI có cấu trúc
```
**Logic:**
1. Lấy tin nhắn cuối cùng từ user
2. Dùng LLM với `structured_output=AgentExtraction` (buộc AI trả về JSON)
3. AI trả lời các câu hỏi:
   - ✅ User yêu cầu đã rõ ràng chưa? (`is_clear`)
   - ❓ Cần hỏi lại user không? (`clarification_question`)
   - 🔄 Viết lại query cho rõ ràng (`rewritten_query`)
   - 📦 Trích xuất tham số tìm kiếm (`extracted_json`)

**Ví dụ:**
```
User: "Mình muốn đi cà phê"
→ is_clear = False
→ clarification_question = "Bạn muốn tìm quán cà phê ở khu vực nào?"

User: "Quán cà phê ở Quận 1, cần wifi"
→ is_clear = True
→ q = "cà phê"
→ location = "Quận 1"
```

---

#### **Node 3: `fetch_real_data_from_api()`**
```
Công dụng: Gọi API để lấy dữ liệu thực
```
**Logic:**
1. Kiểm tra nếu `is_clear = False` → Trả về `None` (dữ liệu trống)
2. Nếu `is_clear = True`:
   - Xây dựng query từ `rewritten_query` hoặc `extracted_json`
   - In log: "🔍 Đang gọi API tìm kiếm..."
   - Gọi API (hiện tại dùng **mock data** để test)
   - Trả về kết quả (danh sách các địa điểm)

**Mock Data:**
```python
{
    "local_results": [
        {
            "title": "Highlands Coffee",
            "address": "135 Nam Kỳ Khởi Nghĩa",
            "rating": 4.5,
            "atmosphere": ["Quiet", "Cozy"]
        },
        ...
    ]
}
```

---

#### **Node 4: `provide_additional_info()`**
```
Công dụng: Trả lời user dựa trên kết quả
```
**Logic:**
1. Nếu `is_clear = False`:
   - Trả về `clarification_question` để hỏi lại user
2. Nếu `is_clear = True`:
   - Lấy data từ API (`real_api_response`)
   - Gọi AI để:
     - 📝 Lọc địa điểm phù hợp với yêu cầu
     - ⭐ Nêu rating, giờ mở cửa
     - 💬 Trả lời thân thiện
   - Trả về câu trả lời cuối cùng

**Ví dụ output:**
```
"Bạn ơi, mình tìm được 2 quán cà phê tuyệt vời ở Quận 1:

1. Highlands Coffee - Dinh Độc Lập
   🏠 135 Nam Kỳ Khởi Nghĩa
   ⭐ 4.5 sao (1205 đánh giá)
   📍 Yên tĩnh, có Wi-Fi, điều hòa
   ⏰ Đang mở cửa · Đóng 22:00

2. The Coffee House - Phạm Ngọc Thạch
   ...
"
```

---

### **3. Định Tuyến Luồng (Routing Logic)**

#### **Hàm `should_continue()`**
```python
def should_continue(state: AgentState) -> str:
    if extraction and not extraction.is_clear:
        return "ask_user"      # Nếu chưa rõ → hỏi lại
    return "provide_info"      # Nếu rõ rồi → cung cấp thông tin
```
- Quyết định đi node nào tiếp theo dựa trên điều kiện

---

### **4. Xây Dựng Đồ Thị Workflow (Graph Building)**

```python
builder = StateGraph(AgentState)

# Thêm 4 node
builder.add_node("summarize_memory", summarize_memory)
builder.add_node("analyze_and_extract", analyze_and_extract)
builder.add_node("fetch_real_data_from_api", fetch_real_data_from_api)
builder.add_node("provide_additional_info", provide_additional_info)

# Thêm các cạnh (edges) kết nối
builder.add_edge(START, "summarize_memory")
builder.add_edge("summarize_memory", "analyze_and_extract")

# Conditional edge - phân nhánh dựa trên điều kiện
builder.add_conditional_edges(
    "analyze_and_extract",
    should_continue,
    {
        "ask_user": "provide_additional_info",
        "provide_info": "fetch_real_data_from_api"
    }
)

builder.add_edge("fetch_real_data_from_api", "provide_additional_info")
builder.add_edge("provide_additional_info", END)

agent_app = builder.compile()
```

---

## 🔄 Luồng Hoạt Động Tổng Quan

### **Sơ đồ Workflow:**

```
START
  ↓
[1. summarize_memory]      → Tóm tắt lịch sử chat
  ↓
[2. analyze_and_extract]   → Phân tích yêu cầu user
  ↓
       ✅ is_clear? ──→ ❌ NO  → [provide_additional_info] → Hỏi lại user → END
       ↓
       YES
       ↓
[3. fetch_real_data_from_api] → Gọi API lấy dữ liệu
  ↓
[4. provide_additional_info] → Trả lời user dựa trên data
  ↓
END
```

---

## 📊 Ví Dụ Chạy Thực Tế

### **Kịch Bản 1: User Yêu Cầu Không Rõ**

```
User: "Mình muốn đi cà phê"

Node 1 (summarize_memory): "Chưa có lịch sử → bỏ qua"

Node 2 (analyze_and_extract): 
  - AI phân tích
  - is_clear = False (thiếu vị trí)
  - clarification_question = "Bạn muốn tìm quán cà phê ở khu vực nào?"

Node 3 (should_continue): Trả về "ask_user"

Node 4 (provide_additional_info):
  AI: "Bạn muốn tìm quán cà phê ở khu vực nào?"
```

### **Kịch Bản 2: User Yêu Cầu Rõ Ràng**

```
User: "Quán cà phê ở Quận 1, yên tĩnh có wifi"

Node 1 (summarize_memory): "Cập nhật tóm tắt"

Node 2 (analyze_and_extract):
  - AI phân tích
  - is_clear = True ✅
  - extracted_json = {q: "cà phê", location: "Quận 1"}
  - rewritten_query = "cà phê yên tĩnh wifi Quận 1"

Node 3 (should_continue): Trả về "provide_info"

Node 4 (fetch_real_data_from_api):
  - Gọi API với query "cà phê yên tĩnh wifi Quận 1"
  - Nhận về mock data (2 quán cà phê)

Node 5 (provide_additional_info):
  - AI lọc dữ liệu, lọc ra quán yên tĩnh, có wifi
  - Trả lời user với các quán phù hợp
```

---

## 🚀 Chế Độ Tương Tác (Interactive Mode)

```python
if __name__ == "__main__":
    while True:
        user_input = input("👨‍💻 Bạn: ")
        
        # Xử lý thoát
        if user_input.lower() in ['quit', 'exit', 'q']:
            break
        
        # Thêm vào state
        state["messages"].append(HumanMessage(content=user_input))
        
        # Gọi agent
        state = agent_app.invoke(state, config)
        
        # In kết quả
        print(f"🤖 AI: {state['messages'][-1].content}\n")
```

**Quy trình:**
1. User nhập tin nhắn
2. Thêm vào `state["messages"]`
3. Gọi `agent_app.invoke()` để chạy workflow
4. In kết quả từ AI

---

## 🔧 Các Công Nghệ Sử Dụng

| Công Nghệ | Tác Dụng |
|-----------|---------|
| **LangChain** | Framework quản lý LLM, prompt, memory |
| **LangGraph** | Xây dựng workflow dạng đồ thị, stateful |
| **Google Generative AI** | Model AI Gemini 2.5-flash |
| **Pydantic** | Validate & parse dữ liệu JSON |
| **TypedDict** | Type hints cho Python dictionaries |

---

## ⚙️ Các Tính Năng Chính

✅ **Memory Management** - Tóm tắt lịch sử chat tự động
✅ **Structured Output** - AI trả về JSON có cấu trúc
✅ **Conditional Routing** - Tự động quyết định đi nhánh nào
✅ **API Integration** - Gọi API lấy dữ liệu thực (mock hiện tại)
✅ **Interactive Chat** - Chatbot tương tác trong terminal
✅ **Error Handling** - Bắt lỗi API & system

---

## 📝 Cách Sử Dụng

1. **Điền Google API Key:**
   ```python
   os.environ["GOOGLE_API_KEY"] = "YOUR_KEY_HERE"
   ```

2. **Chạy chương trình:**
   ```bash
   python test.py
   ```

3. **Nhập yêu cầu:**
   ```
   👨‍💻 Bạn: Mình muốn tìm quán cà phê ở Quận 1, cần yên tĩnh và có wifi
   🤖 AI: [Trả lời với danh sách quán phù hợp]
   ```

4. **Thoát chương trình:**
   ```
   👨‍💻 Bạn: quit
   ```

---

## 🎓 Học Hỏi Thêm

- **LangChain Docs**: https://langchain.readthedocs.io/
- **LangGraph**: https://langchain-ai.github.io/langgraph/
- **Google Generative AI**: https://ai.google.dev/

---

**Tác giả:** Chatbot AI Team  
**Cập nhật:** 2024
