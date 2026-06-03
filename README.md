# WeGo

## Chức năng chính

### Quản lý nhóm
- Lấy danh sách nhóm (GET /api/groups/my)
- Chỉnh sửa thông tin nhóm (PATCH /api/groups/{groupId})
- Mời thành viên (POST /api/groups/{groupId}/invite)
- Lấy danh sách lời mời (GET /api/groups/invitations)
- Chấp nhận lời mời (POST /api/groups/invitations/{memberId}/accept)
- Từ chối lời mời (POST /api/groups/invitations/{memberId}/reject)
- Lấy danh sách thành viên nhóm (GET /api/groups/{groupId}/members)
- Xóa nhóm (DELETE /api/groups//{groupId})
- Xóa thành viên (DELETE /api/groups/{groupId}/members/{targetUid})
- Rời nhóm (DELETE /api/groups/{groupId}/leave)

### Quản lý cuộc hẹn
- Gợi ý địa điểm (POST /api/groups/{groupId}/suggest-place) api này mới chỉ tính toán khoảng cách chứ chưa có AI gợi ý.
- Lấy thông tin địa điểm (GET /api/groups/places/{placeId})
- Đặt lịch hẹn (POST /api/groups/{groupId}/schedule-meet) api này mới chỉ đặt lịch tại 1 thời gian cụ thể cho cả nhóm chứ chưa tính toán traffic cho từng người 
- Lấy danh sách lịch hẹn (GET /api/groups/my-schedules)

### Quản lý người dùng
- Lấy thông tin profile (GET /api/users/me)
- Chỉnh sửa profile (PUT /api/users/me)
- Tìm kiếm bạn bè (GET /api/users/search)

### Quản lý xác thực
- Đăng nhập bằng Google (POST /api/auth/firebase)
- Đăng xuất (POST /api/auth/logout)

---

## Realtime Location

Hệ thống lấy vị trí realtime từ Firebase Realtime Database.

Service:
`FirebaseLocationService.java`

Dữ liệu:

```json
{
  "uid_1": {
    "lat": 10.123,
    "lng": 106.123,
    "name": "Nguyen Van A",
    "updatedAt": 1773922749574
  }
}
```

---

## Gợi ý địa điểm nhóm

Service:
`GroupPlaceSuggestionService.java`

Flow hoạt động:

1. Lấy danh sách member
2. Lấy vị trí realtime
3. Tính center point
4. Tìm địa điểm gần center
5. Tính thời gian di chuyển
6. Sắp xếp theo thời gian tối ưu

---

## Tìm địa điểm bằng SerpAPI

Service:
`SerpApiPlacesService.java`

Sử dụng:
- Google Maps Search API
- Tìm quán gần center point

Ví dụ:

```java
searchNearby(center, "coffee")
```

---

## Cài đặt project

### Backend

```bash
git clone <repo>
cd wego-backend
```

Cấu hình:

```properties
spring.datasource.url=
spring.datasource.username=
spring.datasource.password=

firebase.config.path=

goong.api.key=
serp.api.key=
```

Run:

```bash
./mvnw spring-boot:run
```

---

### Frontend

```bash
cd wego-frontend
npm install
npm run dev
```

---

### AI

```bash
cd chatbot
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

---

## Database

### PostgreSQL
Lưu:
- Group
- Group members
- User

### Firebase
Lưu:
- Live location realtime