import argparse
import json
import os
import sys
from typing import Any, Dict

from agent import run_agent


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


def initial_state() -> Dict[str, Any]:
    """
    Input:
        Không có.

    Output:
        State khởi tạo cho LangGraph agent.

    Mục đích:
        Khi chạy không qua FastAPI, ta vẫn cần một state giống session trong
        memory.py: messages để giữ hội thoại, summary để tóm tắt, last_results
        để user có thể nói "lưu số 2" ở lượt sau.
    """
    return {
        "messages": [],
        "summary": "",
        "last_results": []
    }


def print_response(response: Dict[str, Any], show_places: bool = True) -> None:
    """
    Input:
        response: dict trả về từ run_agent(), cùng shape với ChatResponse API.
        show_places: True thì in danh sách places ở dưới message.

    Output:
        Không return; chỉ format response ra terminal.

    Mục đích:
        Giúp test nhanh mà không cần đọc raw JSON dài.
    """
    print("\n=== BOT ===")
    print(f"status: {response.get('status')}")
    print(response.get("message") or "")

    places = response.get("places") or []
    if show_places and places:
        print("\n=== PLACES ===")
        for index, place in enumerate(places, start=1):
            print(
                f"{index}. {place.get('name')} | "
                f"{place.get('rating')} sao | "
                f"{place.get('reviews')} reviews"
            )
            print(f"   {place.get('address')}")

    print()


def run_one_message(
        message: str,
        session_id: str,
        user_id: str,
        show_json: bool
) -> None:
    """
    Input:
        message: câu user muốn test một lần.
        session_id: id session giả cho state.
        user_id: id user để load/save profile.
        show_json: True thì in raw JSON response.

    Output:
        Không return; chạy một lượt chatbot rồi thoát.

    Mục đích:
        Dùng cho smoke test nhanh bằng command:
        python terminal_chat.py --message "@bot quán cà phê quận 1"
    """
    state = initial_state()
    response, _ = run_agent(
        state,
        message,
        user_id or session_id
    )

    if show_json:
        print(json.dumps(response, ensure_ascii=False, indent=2))
    else:
        print_response(response)


def run_interactive(
        session_id: str,
        user_id: str,
        show_json: bool
) -> None:
    """
    Input:
        session_id: id session giả.
        user_id: id user để lấy profile.
        show_json: True thì in raw JSON mỗi lượt.

    Output:
        Không return; chạy vòng lặp chat cho tới /exit.

    Mục đích:
        Cho phép test agent thật qua terminal mà không cần start FastAPI.
    """
    state = initial_state()
    active_user_id = user_id or session_id

    print("Terminal chatbot test")
    print("Type /exit to quit.\n")

    while True:
        message = input("you> ").strip()
        if not message:
            continue

        if message.lower() in {"/exit", "exit", "quit", "/q"}:
            break

        response, state = run_agent(
            state,
            message,
            active_user_id
        )

        if show_json:
            print(json.dumps(response, ensure_ascii=False, indent=2))
        else:
            print_response(response)


def print_env_warning() -> None:
    """
    Input:
        Không có.

    Output:
        Không return; in cảnh báo nếu thiếu key.

    Mục đích:
        Người test biết vì sao SerpAPI/LLM không chạy đầy đủ nếu chưa tạo .env
        với GOOGLE_API_KEY và SERP_API_KEY.
    """
    missing = [
        key
        for key in ("GOOGLE_API_KEY", "SERP_API_KEY")
        if not os.getenv(key)
    ]

    if not missing:
        return

    print(
        "Warning: missing env key(s): "
        + ", ".join(missing)
    )
    print(
        "Queries handled by the quick rule can still be smoke-tested. "
        "Full SerpAPI search and LLM fallback need these keys in .env.\n"
    )


def main() -> None:
    """
    Input:
        Tham số CLI:
        - --message: chạy một câu rồi thoát.
        - --session-id: session giả.
        - --user-id: user giả.
        - --json: in raw JSON.

    Output:
        Không return.

    Mục đích:
        Entry point chính khi chạy python terminal_chat.py.
    """
    parser = argparse.ArgumentParser(
        description="Run the chatbot directly in terminal without FastAPI."
    )
    parser.add_argument(
        "--message",
        help="Run one message then exit."
    )
    parser.add_argument(
        "--session-id",
        default="terminal-session",
        help="Session id for memory state."
    )
    parser.add_argument(
        "--user-id",
        default="terminal-user",
        help="User id for profile loading/updating."
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print raw JSON response."
    )

    args = parser.parse_args()
    print_env_warning()

    if args.message:
        run_one_message(
            args.message,
            args.session_id,
            args.user_id,
            args.json
        )
        return

    run_interactive(
        args.session_id,
        args.user_id,
        args.json
    )


if __name__ == "__main__":
    main()
