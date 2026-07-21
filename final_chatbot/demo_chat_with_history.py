import json
import sys
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage

from agent import (
    current_preference_keywords,
    get_search_query,
    place_reference_index,
    preference_matches_place_text,
    profile_keywords,
    quick_search_extraction,
    rank_places
)
from profile import (
    add_liked_place,
    get_user_profile,
    merge_profile_tags,
    save_user_profile
)


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


DEMO_USER_ID = "demo-history-user"

# DEMO_PLACES giả lập output đã normalize từ SerpAPI.
# Mỗi item cố tình có đủ rating/reviews/atmosphere/amenities để test ranking
# theo lịch sử user mà không cần gọi API thật.
DEMO_PLACES = [
    {
        "placeId": "demo-cafe-uncle-nick",
        "name": "Uncle Nick's Cafe (& brunch)",
        "address": "211/10 Nguyễn Trãi, Cầu Ông Lãnh, Quận 1",
        "lat": 10.7656196,
        "lng": 106.6883738,
        "rating": 4.9,
        "reviews": 459,
        "hours": "Mở cửa đến 10 PM",
        "atmosphere": ["Casual", "Cozy", "Quiet"],
        "amenities": ["Wi-Fi miễn phí", "Restroom"],
        "thumbnail": None,
        "type": "Cafe"
    },
    {
        "placeId": "demo-cafe-little-hanoi",
        "name": "Little HaNoi Egg Coffee (Yersin)",
        "address": "119/5 Phạm Ngũ Lão, Bến Thành, Quận 1",
        "lat": 10.7678,
        "lng": 106.6944,
        "rating": 4.8,
        "reviews": 5418,
        "hours": "Mở cửa đến 9:30 PM",
        "atmosphere": ["Casual", "Cozy", "Quiet", "Romantic", "Trendy"],
        "amenities": ["Restroom"],
        "thumbnail": None,
        "type": "Cafe"
    },
    {
        "placeId": "demo-cafe-running-bean",
        "name": "The Running Bean",
        "address": "33 Mạc Thị Bưởi, Sài Gòn, Quận 1",
        "lat": 10.7759,
        "lng": 106.7041,
        "rating": 4.7,
        "reviews": 3101,
        "hours": "Mở cửa đến 10 PM",
        "atmosphere": ["Casual", "Cozy", "Quiet", "Upscale"],
        "amenities": ["Wi-Fi miễn phí", "Restroom"],
        "thumbnail": None,
        "type": "Cafe, Brunch restaurant"
    },
    {
        "placeId": "demo-cafe-soo-kafe",
        "name": "Soo Kafe",
        "address": "35 Phan Chu Trinh, Bến Thành, Quận 1",
        "lat": 10.772408,
        "lng": 106.6972096,
        "rating": 4.6,
        "reviews": 1973,
        "hours": "Mở cửa đến 11 PM",
        "atmosphere": ["Cozy", "Romantic", "Trendy"],
        "amenities": ["Restroom"],
        "thumbnail": None,
        "type": "Cafe"
    },
    {
        "placeId": "demo-jp-nori",
        "name": "Nori - Modern Izakaya",
        "address": "114 Lý Tự Trọng, Bến Thành, Quận 1",
        "lat": 10.7735,
        "lng": 106.6966,
        "rating": 4.8,
        "reviews": 2237,
        "hours": "Mở cửa lại lúc 6 PM",
        "atmosphere": ["Cozy", "Trendy"],
        "amenities": ["Wi-Fi miễn phí", "Bar onsite"],
        "thumbnail": None,
        "type": "Japanese restaurant, Izakaya"
    },
    {
        "placeId": "demo-jp-matsuri",
        "name": "Matsuri Japanese Restaurant - Nguyễn Huệ",
        "address": "3 Nguyễn Huệ, Sài Gòn, Quận 1",
        "lat": 10.7731,
        "lng": 106.7047,
        "rating": 4.8,
        "reviews": 1070,
        "hours": "Mở cửa đến 10 PM",
        "atmosphere": ["Cozy", "Quiet", "Romantic", "Upscale"],
        "amenities": ["Wi-Fi miễn phí", "Restroom", "Bar onsite"],
        "thumbnail": None,
        "type": "Japanese restaurant"
    },
    {
        "placeId": "demo-bbq-po",
        "name": "PO BBQ Buffet Lẩu Nướng 139k",
        "address": "96 Tô Vĩnh Diện, Thủ Đức",
        "lat": 10.8535243,
        "lng": 106.7680768,
        "rating": 4.9,
        "reviews": 5590,
        "hours": "Mở cửa đến 11 PM",
        "atmosphere": ["Casual", "Cozy", "Quiet"],
        "amenities": ["Wi-Fi miễn phí", "Restroom"],
        "thumbnail": None,
        "type": "Barbecue restaurant, Buffet restaurant"
    }
]


def seed_demo_profile() -> Dict[str, Any]:
    """
    Input:
        Không có input từ bên ngoài.

    Output:
        dict profile demo đã được lưu vào profiles.json với user_id cố định.

    Mục đích:
        Tạo lịch sử giả để test cá nhân hóa. Profile này mô phỏng user từng
        thích quán cà phê Quận 1, có Wi-Fi, ấm cúng/yên tĩnh và đồ Nhật.
    """
    profile = get_user_profile(DEMO_USER_ID, "Demo User")
    profile["tags"] = [
        "quán cà phê",
        "quận 1",
        "wifi",
        "ấm cúng",
        "yên tĩnh",
        "nhà hàng nhật",
        "rating cao"
    ]
    profile["liked_places"] = [
        {
            "placeId": "demo-cafe-uncle-nick",
            "name": "Uncle Nick's Cafe (& brunch)",
            "address": "211/10 Nguyễn Trãi, Cầu Ông Lãnh, Quận 1",
            "reason": "Lịch sử giả: user từng thích quán có Wi-Fi, ấm cúng và yên tĩnh."
        },
        {
            "placeId": "demo-jp-matsuri",
            "name": "Matsuri Japanese Restaurant - Nguyễn Huệ",
            "address": "3 Nguyễn Huệ, Sài Gòn, Quận 1",
            "reason": "Lịch sử giả: user từng thích đồ Nhật ở trung tâm."
        }
    ]
    profile["history"] = [
        {
            "type": "preference",
            "text": "User hay chọn quán cà phê ở Quận 1 có Wi-Fi, không gian ấm cúng/yên tĩnh."
        },
        {
            "type": "preference",
            "text": "User cũng thích nhà hàng Nhật lãng mạn, rating cao."
        }
    ]
    save_user_profile(profile)
    return profile


def profile_summary_text(profile: Dict[str, Any]) -> str:
    """
    Input:
        profile: dict profile đọc từ profiles.json.

    Output:
        Chuỗi ngắn mô tả tags lịch sử và các địa điểm đã từng thích.

    Mục đích:
        Đây là dạng profile rút gọn sẽ được đưa vào ranking/prompt. Không dùng
        toàn bộ history dài để tránh nhiễu và tốn token.
    """
    tags = profile.get("tags", [])
    liked_places = profile.get("liked_places", [])
    lines = []

    if tags:
        lines.append("Tags lịch sử: " + ", ".join(tags))

    if liked_places:
        names = [
            place.get("name")
            for place in liked_places
            if place.get("name")
        ]
        lines.append("Đã từng thích: " + ", ".join(names[:3]))

    return "\n".join(lines)


def choose_demo_candidates(search_query: str) -> List[Dict[str, Any]]:
    """
    Input:
        search_query: query rộng đã được rewrite, ví dụ "quán cà phê quận 1".

    Output:
        Danh sách địa điểm demo cùng loại với query.

    Mục đích:
        Giả lập bước SerpAPI. Ở app thật, fetch_real_data_from_api() sẽ gọi
        SerpAPI; trong demo này ta chọn từ DEMO_PLACES để test nhanh offline.
    """
    lowered = search_query.lower()

    if any(keyword in lowered for keyword in ["cà phê", "cafe", "coffee"]):
        return [
            place
            for place in DEMO_PLACES
            if "cafe" in place.get("type", "").lower()
        ]

    if any(keyword in lowered for keyword in ["nhật", "sushi", "izakaya"]):
        return [
            place
            for place in DEMO_PLACES
            if "japanese" in place.get("type", "").lower()
            or "izakaya" in place.get("type", "").lower()
        ]

    if any(keyword in lowered for keyword in ["nướng", "bbq", "buffet"]):
        return [
            place
            for place in DEMO_PLACES
            if "barbecue" in place.get("type", "").lower()
            or "buffet" in place.get("type", "").lower()
        ]

    return DEMO_PLACES


def place_text(place: Dict[str, Any]) -> str:
    """
    Input:
        place: một địa điểm demo/SerpAPI đã normalize.

    Output:
        Text ghép từ name, address, type, atmosphere, amenities.

    Mục đích:
        Tạo một chuỗi dễ match khi giải thích vì sao địa điểm hợp với yêu cầu
        hiện tại hoặc profile lịch sử.
    """
    return " ".join([
        str(place.get("name") or ""),
        str(place.get("address") or ""),
        str(place.get("type") or ""),
        " ".join(place.get("atmosphere") or []),
        " ".join(place.get("amenities") or [])
    ]).lower()


def explain_match(
        place: Dict[str, Any],
        profile: Dict[str, Any],
        user_message: str
) -> str:
    """
    Input:
        place: địa điểm đang được giải thích.
        profile: profile demo của user.
        user_message: câu hỏi hiện tại của user.

    Output:
        Chuỗi lý do ngắn, ví dụ "match yêu cầu hiện tại: wifi".

    Mục đích:
        Giúp người test nhìn thấy cá nhân hóa hoạt động như thế nào: match từ
        câu hiện tại, match từ lịch sử, hoặc địa điểm từng được lưu.
    """
    text = place_text(place)
    current_prefs = current_preference_keywords(user_message)
    profile_words = profile_keywords(profile_summary_text(profile))

    reasons = []
    for pref in current_prefs:
        if preference_matches_place_text(pref, text):
            reasons.append(f"match yêu cầu hiện tại: {pref}")

    for tag in profile.get("tags", []):
        if tag.lower() in text and len(reasons) < 4:
            reasons.append(f"match lịch sử: {tag}")

    for liked in profile.get("liked_places", []):
        if liked.get("placeId") == place.get("placeId"):
            reasons.append("bạn từng thích địa điểm này trong lịch sử giả")
            break

    if not reasons and profile_words:
        reasons.append("được xếp hạng cao sau khi so với profile lịch sử")

    return "; ".join(reasons[:4]) or "rating/reviews tốt trong dữ liệu demo"


def print_profile(profile: Dict[str, Any]) -> None:
    """
    Input:
        profile: profile hiện tại.

    Output:
        Không return; in profile ra terminal.

    Mục đích:
        Hỗ trợ lệnh /profile để người test xem lịch sử giả và thấy profile thay
        đổi sau khi dùng lệnh "lưu số 1".
    """
    print("\n=== PROFILE GIẢ ĐANG DÙNG ===")
    print(profile_summary_text(profile))
    print()


def print_help() -> None:
    """
    Input:
        Không có.

    Output:
        Không return; in các câu/lệnh mẫu.

    Mục đích:
        Người mới mở demo có thể copy nhanh câu hỏi để test luồng search rộng
        rồi rank lại bằng profile.
    """
    print("Lệnh thử nhanh:")
    print("- @bot quán cà phê quận 1")
    print("- @bot quán cà phê ấm cúng có wifi ở quận 1")
    print("- @bot nhà hàng Nhật lãng mạn gần trung tâm Sài Gòn")
    print("- lưu số 1")
    print("- /profile")
    print("- /exit\n")


def fix_terminal_input(text: str) -> str:
    """
    Input:
        text: chuỗi user nhập từ terminal.

    Output:
        Text đã sửa lỗi mojibake nếu PowerShell làm hỏng tiếng Việt.

    Mục đích:
        Khi pipe/gõ tiếng Việt trên Windows, đôi lúc terminal biến "quán" thành
        "quÃ¡n". Hàm này cố gắng sửa lại để regex tiếng Việt vẫn match đúng.
    """
    vietnamese_marks = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
    looks_mojibake = any(
        marker in text
        for marker in ("Ã", "Â", "áº", "á»")
    )

    if (
        not looks_mojibake
        and any(char in text.lower() for char in vietnamese_marks)
    ):
        return text

    for source_encoding in ("cp1252", "latin1"):
        try:
            repaired = text.encode(source_encoding).decode("utf-8")
        except UnicodeError:
            continue

        if any(char in repaired.lower() for char in vietnamese_marks):
            return repaired

    return text


def handle_save_command(
        message: str,
        last_results: List[Dict[str, Any]],
        profile: Dict[str, Any]
) -> bool:
    """
    Input:
        message: câu user nhập, ví dụ "lưu số 1".
        last_results: kết quả gợi ý gần nhất đang hiển thị trong terminal.
        profile: profile demo hiện tại.

    Output:
        True nếu message là lệnh lưu/chọn và đã được xử lý.
        False nếu không phải lệnh lưu/chọn.

    Mục đích:
        Demo bước user chọn địa điểm. Khi user lưu một kết quả, địa điểm đó
        được đưa vào liked_places và một số atmosphere/amenities được merge vào
        tags để các lượt sau có thể cá nhân hóa hơn.
    """
    lowered = message.lower()
    if not any(word in lowered for word in ["lưu", "luu", "save", "chọn", "chon", "chốt", "chot"]):
        return False

    index = place_reference_index(message)
    if index is None:
        index = 0

    if index < 0 or index >= len(last_results):
        print("BOT> Mình chưa tìm thấy địa điểm đó trong kết quả gần nhất.")
        return True

    selected = dict(last_results[index])
    selected["reason"] = "User lưu/chọn trong terminal demo."
    add_liked_place(profile, selected)
    merge_profile_tags(profile, selected.get("atmosphere", []))
    merge_profile_tags(profile, selected.get("amenities", []))
    save_user_profile(profile)

    print(f"BOT> Đã lưu {selected.get('name')} vào profile demo.")
    return True


def main() -> None:
    """
    Input:
        Không nhận tham số dòng lệnh. Người dùng tương tác qua input terminal.

    Output:
        Không return; chạy vòng lặp chat cho tới khi user nhập /exit.

    Luồng hoạt động:
        1. Tạo profile giả bằng seed_demo_profile().
        2. User nhập câu hỏi.
        3. quick_search_extraction() kiểm tra query đã clear chưa.
        4. choose_demo_candidates() giả lập SerpAPI search rộng.
        5. rank_places() xếp hạng theo yêu cầu hiện tại + lịch sử profile.
        6. In kết quả và lý do match ra terminal.
    """
    profile = seed_demo_profile()
    messages: List[HumanMessage] = []
    last_results: List[Dict[str, Any]] = []

    print("Demo chatbot cá nhân hóa bằng terminal")
    print("Không cần GOOGLE_API_KEY/SERP_API_KEY, dùng dữ liệu địa điểm giả.")
    print_profile(profile)
    print_help()

    while True:
        message = fix_terminal_input(
            input("you> ").strip()
        )
        if not message:
            continue

        if message.lower() in {"/exit", "exit", "quit", "/q"}:
            break

        if message.lower() == "/profile":
            profile = get_user_profile(DEMO_USER_ID)
            print_profile(profile)
            continue

        if handle_save_command(message, last_results, profile):
            profile = get_user_profile(DEMO_USER_ID)
            continue

        messages.append(HumanMessage(content=message))
        extraction = quick_search_extraction(
            message,
            messages
        )

        if extraction is None:
            print(
                "BOT> Demo rule chưa hiểu rõ ý này. "
                "Bạn thử hỏi theo dạng: @bot quán cà phê quận 1"
            )
            continue

        if not extraction.is_clear:
            print(f"BOT> {extraction.clarification_question}")
            continue

        search_query = get_search_query(extraction) or message
        candidates = choose_demo_candidates(search_query)
        profile_text = profile_summary_text(profile)
        ranked = rank_places(
            candidates,
            profile_text,
            message
        )[:3]
        last_results = ranked

        print(f"\nBOT> Mình search rộng bằng query: {search_query}")
        print("BOT> Sau đó rank lại bằng yêu cầu hiện tại + lịch sử user.")
        print("\n=== GỢI Ý CÁ NHÂN HÓA ===")
        for index, place in enumerate(ranked, start=1):
            print(
                f"{index}. {place.get('name')} "
                f"({place.get('rating')} sao, {place.get('reviews')} reviews)"
            )
            print(f"   Địa chỉ: {place.get('address')}")
            print(f"   Không gian: {', '.join(place.get('atmosphere') or [])}")
            print(f"   Tiện ích: {', '.join(place.get('amenities') or [])}")
            print(f"   Vì sao hợp: {explain_match(place, profile, message)}")
        print()


if __name__ == "__main__":
    main()
