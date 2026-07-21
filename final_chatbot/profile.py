import json
import os
import argparse
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

PROFILE_DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "profiles.json"
)


def load_profiles() -> Dict[str, Any]:
    """
    Input:
        Không có.

    Output:
        Dict toàn bộ profiles đang lưu trong profiles.json.

    Mục đích:
        Đọc database profile local. Nếu file chưa tồn tại hoặc JSON lỗi thì trả
        về dict rỗng để app vẫn chạy được.
    """
    if not os.path.exists(PROFILE_DB_PATH):
        return {}

    with open(PROFILE_DB_PATH, "r", encoding="utf-8") as handle:
        try:
            return json.load(handle)
        except json.JSONDecodeError:
            return {}


def save_profiles(profiles: Dict[str, Any]) -> None:
    """
    Input:
        profiles: dict tất cả user profile, key thường là user_id.

    Output:
        Không return; ghi profiles vào profiles.json.

    Mục đích:
        Persist profile sau khi trích từ log hoặc sau khi user chọn/lưu địa điểm.
    """
    os.makedirs(os.path.dirname(PROFILE_DB_PATH), exist_ok=True)
    with open(PROFILE_DB_PATH, "w", encoding="utf-8") as handle:
        json.dump(profiles, handle, ensure_ascii=False, indent=2)


def get_user_profile(
    user_id: str,
    user_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Input:
        user_id: id định danh user.
        user_name: tên hiển thị nếu có.

    Output:
        Dict profile của user.

    Mục đích:
        Load profile theo user_id. Nếu chưa có thì tạo profile mặc định gồm
        tags, liked_places và history.
    """
    profiles = load_profiles()
    profile = profiles.get(user_id)

    if profile is None:
        profile = {
            "user_id": user_id,
            "name": user_name,
            "tags": [],
            "liked_places": [],
            "history": []
        }
    else:
        if user_name:
            profile["name"] = user_name

    profiles[user_id] = profile
    save_profiles(profiles)

    return profile


def save_user_profile(profile: Dict[str, Any]) -> None:
    profiles = load_profiles()
    profiles[profile["user_id"]] = profile
    save_profiles(profiles)



def add_profile_history(
    profile: Dict[str, Any],
    text: str,
    event_type: str = "interaction"
) -> None:
    """
    Input:
        profile: dict profile cần cập nhật.
        text: nội dung/history note cần lưu.
        event_type: loại event, ví dụ interaction hoặc preference.

    Output:
        Không return; mutate profile ngay trong memory.

    Mục đích:
        Ghi dấu vết vì sao profile được cập nhật.
    """
    profile.setdefault("history", []).append({
        "text": text,
        "type": event_type,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    })


def merge_profile_tags(profile: Dict[str, Any], tags: List[str]) -> None:
    """
    Input:
        profile: dict profile cần cập nhật.
        tags: list sở thích/thuộc tính mới.

    Output:
        Không return; profile['tags'] được merge và sort.

    Mục đích:
        Gộp tag mới vào profile, tránh trùng lặp và normalize lowercase.
    """
    existing = set(profile.get("tags", []))
    cleaned = {tag.strip().lower() for tag in tags if tag and isinstance(tag, str)}
    profile["tags"] = sorted(existing.union(cleaned))


def add_liked_place(
    profile: Dict[str, Any],
    place: Dict[str, Any]
) -> None:
    """
    Input:
        profile: profile user.
        place: địa điểm user đã thích/chọn/lưu.

    Output:
        Không return; thêm place vào profile['liked_places'] nếu chưa tồn tại.

    Mục đích:
        Lưu địa điểm user chọn để các lần recommend sau có thể cá nhân hóa.
    """
    liked_places = profile.setdefault("liked_places", [])
    if not place.get("name"):
        return

    for existing in liked_places:
        if place.get("placeId") and existing.get("placeId") == place.get("placeId"):
            return
        if place.get("name") and existing.get("name") == place.get("name"):
            return

    liked_places.append(place)


BOT_UIDS = {
    "wego_ai",
    "bot",
    "assistant",
    "chatbot"
}

PROFILE_FIELD_KEYWORDS = {
    "categories": {
        "quán cà phê": ["cà phê", "cafe", "coffee"],
        "quán nướng": ["quán nướng", "đồ nướng", "bbq", "lẩu nướng"],
        "buffet": ["buffet"],
        "nhà hàng nhật": ["đồ nhật", "nhật bản", "sushi", "izakaya", "japanese"],
        "món chay": ["quán chay", "đồ chay", "buffet chay", "món chay"],
        "trà sữa": ["trà sữa", "milk tea"],
        "brunch": ["brunch"]
    },
    "locations": {
        "quận 1": ["quận 1", "q1", "district 1"],
        "quận 3": ["quận 3", "q3", "district 3"],
        "quận 7": ["quận 7", "q7", "district 7"],
        "thủ đức": ["thủ đức", "thu duc"],
        "trung tâm sài gòn": ["trung tâm sài gòn", "trung tâm saigon", "gần trung tâm"],
        "vincom mega mall grand park": ["vincom mega mall", "grand park", "88 phước thiện"]
    },
    "amenities": {
        "wifi": ["wifi", "wi-fi", "wi fi"],
        "nhà vệ sinh": ["nhà vệ sinh", "restroom", "toilet"],
        "quầy bar": ["quầy bar", "bar tại chỗ", "bar on site"]
    },
    "atmosphere": {
        "ấm cúng": ["ấm cúng", "cozy", "cosy"],
        "yên tĩnh": ["yên tĩnh", "quiet"],
        "lãng mạn": ["lãng mạn", "romantic"],
        "sang trọng": ["sang trọng", "upscale"],
        "hợp xu hướng": ["hợp xu hướng", "trendy", "trending"],
        "thoải mái": ["thoải mái", "casual"],
        "phong cách anime/nhật": ["anime", "hầu gái", "maid", "nhật bản"]
    },
    "constraints": {
        "rating cao": ["rating cao", "đánh giá cao", "rated cao", "review cao"],
        "nhiều đánh giá": ["nhiều đánh giá", "nhiều review", "lượng review"],
        "giá phải chăng": ["giá phải chăng", "rẻ", "139k", "159k", "bình dân"],
        "gần đây": ["gần đây", "near me", "gần khu vực đó"]
    }
}


def _normalize_text(text: Optional[str]) -> str:
    if not text:
        return ""

    return re.sub(
        r"\s+",
        " ",
        text.replace("@bot", " ")
    ).strip()


def _append_unique(items: List[Any], value: Any) -> None:
    if value not in items:
        items.append(value)


def _message_type(message: Dict[str, Any]) -> str:
    return str(message.get("type") or "").lower()


def _is_bot_message(message: Dict[str, Any], bot_uids: Optional[set[str]] = None) -> bool:
    sender_uid = str(message.get("senderUid") or "").lower()
    msg_type = _message_type(message)
    known_bot_uids = {uid.lower() for uid in (bot_uids or BOT_UIDS)}

    return (
        sender_uid in known_bot_uids
        or msg_type == "ai-text"
        or msg_type == "map"
    )


def _is_bot_request(text: str) -> bool:
    lowered = text.lower()
    return "@bot" in lowered or lowered.startswith("bot ")


def _timestamp_to_iso(timestamp: Optional[Any]) -> Optional[str]:
    if timestamp is None:
        return None

    try:
        value = int(timestamp)
        if value > 10_000_000_000:
            value = value / 1000
        return datetime.utcfromtimestamp(value).isoformat() + "Z"
    except (TypeError, ValueError, OSError):
        return None


def _map_data_to_place(message: Dict[str, Any]) -> Dict[str, Any]:
    map_data = message.get("mapData") or {}

    return {
        "name": map_data.get("title"),
        "address": map_data.get("description"),
        "lat": map_data.get("lat"),
        "lng": map_data.get("lng"),
        "thumbnail": map_data.get("imageUri"),
        "selected_at": _timestamp_to_iso(message.get("timestamp"))
    }


def load_group_chat_messages(export_path: str) -> List[Dict[str, Any]]:
    """
    Input:
        export_path: đường dẫn file Firebase Realtime Database export JSON.

    Output:
        List message đã flatten và sort theo timestamp. Mỗi item được thêm
        groupId và messageId để biết message đến từ group nào.

    Mục đích:
        Chuyển cấu trúc group_chats -> group_id -> message_id thành list phẳng,
        dễ gom thành vòng hội thoại.
    """
    with open(export_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)

    group_chats = data.get("group_chats", {})
    messages: List[Dict[str, Any]] = []

    for group_id, group_messages in group_chats.items():
        if not isinstance(group_messages, dict):
            continue

        for message_id, message in group_messages.items():
            if not isinstance(message, dict):
                continue

            normalized = dict(message)
            normalized["groupId"] = group_id
            normalized["messageId"] = message_id
            messages.append(normalized)

    return sorted(
        messages,
        key=lambda item: int(item.get("timestamp") or 0)
    )


def build_completed_recommendation_rounds(
    messages: List[Dict[str, Any]],
    bot_uids: Optional[set[str]] = None
) -> List[Dict[str, Any]]:
    """
    Input:
        messages: list message đã flatten từ load_group_chat_messages().
        bot_uids: set senderUid được coi là bot, mặc định dùng BOT_UIDS.

    Output:
        List recommendation round. Mỗi round gồm:
        - group_id
        - user_id/user_name
        - user_messages
        - bot_responses
        - places
        - selected_place nếu có mapData

    Mục đích:
        Định nghĩa "một vòng cá nhân hóa" từ log nhóm:
        user hỏi bot -> bot trả lời -> bot gửi mapData. Nếu vòng có nhiều map,
        map cuối được coi là selected_place/địa điểm cuối cùng trong vòng.
    """
    rounds: List[Dict[str, Any]] = []
    active_by_group: Dict[str, Dict[str, Any]] = {}

    def finish_round(group_id: str) -> None:
        active_round = active_by_group.pop(group_id, None)
        if not active_round:
            return

        if active_round.get("bot_responses") or active_round.get("places"):
            places = active_round.get("places", [])
            if places:
                active_round["selected_place"] = places[-1]
            rounds.append(active_round)

    for message in messages:
        group_id = str(message.get("groupId") or "")
        msg_type = _message_type(message)
        text = message.get("text") or ""
        is_bot = _is_bot_message(message, bot_uids)

        if not is_bot and msg_type == "text":
            active_round = active_by_group.get(group_id)
            should_start_new = (
                _is_bot_request(text)
                or active_round is None
                or bool(active_round.get("bot_responses"))
                or bool(active_round.get("places"))
            )

            if should_start_new:
                finish_round(group_id)
                active_round = {
                    "group_id": group_id,
                    "user_id": message.get("senderUid"),
                    "user_name": message.get("senderName"),
                    "started_at": _timestamp_to_iso(message.get("timestamp")),
                    "user_messages": [],
                    "bot_responses": [],
                    "places": []
                }
                active_by_group[group_id] = active_round

            if active_round:
                active_round["user_messages"].append({
                    "text": _normalize_text(text),
                    "timestamp": _timestamp_to_iso(message.get("timestamp"))
                })
            continue

        active_round = active_by_group.get(group_id)
        if not active_round:
            continue

        if msg_type == "ai-text":
            active_round["bot_responses"].append({
                "text": _normalize_text(text),
                "timestamp": _timestamp_to_iso(message.get("timestamp"))
            })
        elif msg_type == "map":
            place = _map_data_to_place(message)
            if place.get("name"):
                active_round["places"].append(place)

    for group_id in list(active_by_group):
        finish_round(group_id)

    return rounds


def infer_profile_fields_from_round(round_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Input:
        round_data: một vòng recommendation đã gom từ log.

    Output:
        Dict các field profile rút trích được:
        categories, locations, amenities, atmosphere, constraints,
        negative_signals.

    Mục đích:
        Đọc cả câu user và response bot để rút sở thích. Ví dụ user hỏi
        "quán cà phê có wifi quận 1", bot response có "Cozy/Quiet", thì profile
        có thể ghi nhận category, location, tiện ích và không gian liên quan.
    """
    user_text = " ".join(
        item.get("text", "")
        for item in round_data.get("user_messages", [])
    )
    bot_text = " ".join(
        item.get("text", "")
        for item in round_data.get("bot_responses", [])
    )
    combined = f"{user_text} {bot_text}".lower()
    user_only = user_text.lower()

    fields = {
        "categories": [],
        "locations": [],
        "amenities": [],
        "atmosphere": [],
        "constraints": [],
        "negative_signals": []
    }

    for field_name, keyword_map in PROFILE_FIELD_KEYWORDS.items():
        search_text = user_only if field_name in {"categories", "locations"} else combined
        for label, keywords in keyword_map.items():
            if any(keyword in search_text for keyword in keywords):
                _append_unique(fields[field_name], label)

    if any(word in user_only for word in ["ngại", "không thích", "không muốn", "né"]):
        fields["negative_signals"].append(_normalize_text(user_text))

    return fields


def build_profiles_from_group_chat_export(
    export_path: str,
    output_path: Optional[str] = None,
    merge_into_profile_db: bool = False
) -> Dict[str, Any]:
    """
    Input:
        export_path: file JSON export từ Firebase.
        output_path: nơi ghi profile trích được, ví dụ profiles_from_logs.json.
        merge_into_profile_db: True thì merge kết quả vào profiles.json hiện tại.

    Output:
        Dict profiles đã trích theo user_id.

    Mục đích:
        Pipeline offline đầy đủ:
        1. Đọc log nhóm.
        2. Gom thành các vòng recommendation hoàn chỉnh.
        3. Trích field profile từ từng vòng.
        4. Lưu selected_place/liked_places.
        5. Ghi ra file hoặc merge vào profile DB.
    """
    messages = load_group_chat_messages(export_path)
    rounds = build_completed_recommendation_rounds(messages)
    profiles: Dict[str, Any] = {}

    for round_data in rounds:
        user_id = round_data.get("user_id")
        if not user_id:
            continue

        profile = profiles.setdefault(user_id, {
            "user_id": user_id,
            "name": round_data.get("user_name"),
            "tags": [],
            "preferred_categories": [],
            "preferred_locations": [],
            "preferred_amenities": [],
            "preferred_atmosphere": [],
            "constraints": [],
            "negative_signals": [],
            "selected_places": [],
            "history": []
        })

        if round_data.get("user_name"):
            profile["name"] = round_data.get("user_name")

        fields = infer_profile_fields_from_round(round_data)

        field_to_profile_key = {
            "categories": "preferred_categories",
            "locations": "preferred_locations",
            "amenities": "preferred_amenities",
            "atmosphere": "preferred_atmosphere",
            "constraints": "constraints",
            "negative_signals": "negative_signals"
        }

        for field_name, values in fields.items():
            profile_key = field_to_profile_key[field_name]
            for value in values:
                _append_unique(profile[profile_key], value)
                if field_name != "negative_signals":
                    _append_unique(profile["tags"], value)

        selected_place = round_data.get("selected_place")
        if selected_place:
            add_liked_place(profile, selected_place)
            _append_unique(profile["selected_places"], selected_place)

        profile["history"].append({
            "type": "recommendation_round",
            "group_id": round_data.get("group_id"),
            "started_at": round_data.get("started_at"),
            "user_messages": round_data.get("user_messages", []),
            "bot_responses": round_data.get("bot_responses", []),
            "selected_place": selected_place,
            "extracted_fields": fields
        })

    for profile in profiles.values():
        profile["tags"] = sorted(profile.get("tags", []))

    if merge_into_profile_db:
        existing_profiles = load_profiles()
        for user_id, extracted_profile in profiles.items():
            existing_profile = existing_profiles.get(user_id, {
                "user_id": user_id,
                "name": extracted_profile.get("name"),
                "tags": [],
                "liked_places": [],
                "history": []
            })

            if extracted_profile.get("name"):
                existing_profile["name"] = extracted_profile.get("name")

            merge_profile_tags(existing_profile, extracted_profile.get("tags", []))
            for place in extracted_profile.get("selected_places", []):
                add_liked_place(existing_profile, place)
            existing_profile.setdefault("history", []).extend(
                extracted_profile.get("history", [])
            )
            existing_profiles[user_id] = existing_profile

        save_profiles(existing_profiles)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as handle:
            json.dump(profiles, handle, ensure_ascii=False, indent=2)

    return profiles


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract personalized user profiles from Firebase group chat logs."
    )
    parser.add_argument(
        "export_path",
        help="Path to Firebase realtime database export JSON."
    )
    parser.add_argument(
        "-o",
        "--output",
        default=os.path.join(os.path.dirname(__file__), "profiles_from_logs.json"),
        help="Output JSON path."
    )
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Also merge extracted tags and selected places into profiles.json."
    )
    args = parser.parse_args()

    profiles = build_profiles_from_group_chat_export(
        args.export_path,
        args.output,
        args.merge
    )

    print(f"Extracted {len(profiles)} user profile(s) to {args.output}")


if __name__ == "__main__":
    main()
