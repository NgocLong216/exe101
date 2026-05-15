import { useEffect, useRef, useState } from "react";

import {
  onValue,
  push,
  ref,
  set,
  off
} from "firebase/database";



import { db } from "../../firebase";

export default function GroupChatPage() {

    const groupId = "group_123";

    // fake current user
    const currentUser = {
        uid: "user_1",
        name: "Long",
    };

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");

    const bottomRef = useRef();


    useEffect(() => {

        const messagesRef = ref(db, `group_chats/${groupId}`);

        const unsubscribe = onValue(messagesRef, (snapshot) => {

            const data = snapshot.val();

            console.log("Firebase data:", data);

            if (!data) {
                setMessages([]);
                return;
            }

            const loadedMessages = Object.entries(data).map(
                ([id, value]) => ({
                    id,
                    ...value,
                })
            );

            loadedMessages.sort(
                (a, b) => a.timestamp - b.timestamp
            );

            setMessages(loadedMessages);
        });

        return () => {
            off(messagesRef);
        };

    }, []);



    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    const sendMessage = async () => {

        if (!text.trim()) return;

        const messagesRef = ref(
            db,
            `group_chats/${groupId}`
        );

        const newMessageRef = push(messagesRef);

        await set(newMessageRef, {
            senderUid: currentUser.uid,
            senderName: currentUser.name,
            text,
            timestamp: Date.now(),
        });

        setText("");
    };

    return (
        <div className="h-screen flex bg-gray-100">

            {/* Sidebar */}
            <div className="w-72 bg-white border-r p-4">
                <h1 className="text-2xl font-bold mb-4">
                    WeGo Chat
                </h1>

                <div className="p-3 rounded-xl bg-blue-100 cursor-pointer">
                    Group Meetup
                </div>
            </div>

            {/* Chat */}
            <div className="flex-1 flex flex-col">

                {/* Header */}
                <div className="bg-white border-b p-4 font-semibold text-lg">
                    Group Meetup
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">

                    {messages.map((msg) => {

                        const isMine =
                            msg.senderUid === currentUser.uid;

                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMine
                                        ? "justify-end"
                                        : "justify-start"
                                    }`}
                            >

                                <div
                                    className={`max-w-xs px-4 py-2 rounded-2xl shadow ${isMine
                                            ? "bg-blue-500 text-white"
                                            : "bg-white"
                                        }`}
                                >

                                    {!isMine && (
                                        <div className="text-xs font-semibold mb-1 text-gray-500">
                                            {msg.senderName}
                                        </div>
                                    )}

                                    <div>{msg.text}</div>

                                </div>
                            </div>
                        );
                    })}

                    <div ref={bottomRef} />

                </div>

                {/* Input */}
                <div className="bg-white border-t p-4 flex gap-3">

                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && sendMessage()
                        }
                        placeholder="Type a message..."
                        className="flex-1 border rounded-full px-4 py-3 outline-none"
                    />

                    <button
                        onClick={sendMessage}
                        className="bg-blue-500 text-white px-5 rounded-full"
                    >
                        Send
                    </button>

                </div>
            </div>
        </div>
    );
}

