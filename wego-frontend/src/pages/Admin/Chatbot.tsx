import { Send, Bot, RotateCcw, Zap, MessageSquare, TrendingUp, Activity } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  time: string;
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content: "Hello! I'm your AI assistant. How can I help you manage operations today?",
    time: "09:00 AM",
  },
  {
    id: 2,
    role: "user",
    content: "How many active users do we have this month?",
    time: "09:01 AM",
  },
  {
    id: 3,
    role: "assistant",
    content: "Based on the latest data, you have 24,892 total users with a 12% growth compared to last month. Approximately 18,400 users are currently active this month.",
    time: "09:01 AM",
  },
];

const quickPrompts = [
  "Show system status",
  "List recent appointments",
  "Token usage summary",
  "Active users today",
];

const tokenStats = [
  { label: "Tokens Today", value: "42.3k", icon: Zap, color: "text-amber-500" },
  { label: "Conversations", value: "1,284", icon: MessageSquare, color: "text-blue-500" },
  { label: "Avg. Response", value: "1.2s", icon: Activity, color: "text-emerald-500" },
  { label: "Satisfaction", value: "94%", icon: TrendingUp, color: "text-violet-500" },
];

let nextId = 4;

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const now = () =>
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: nextId++, role: "user", content: text, time: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const botMsg: Message = {
        id: nextId++,
        role: "assistant",
        content: `I've processed your request: "${text}". This is a demo response — in production, this would connect to your AI backend.`,
        time: now(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1400);
  };

  return (
    <div className="p-8 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chatbot</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI-powered assistant for operational queries.</p>
        </div>
        <button
          onClick={() => setMessages(initialMessages)}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <RotateCcw size={13} /> Reset Chat
        </button>
      </div>

      {/* Token stats */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {tokenStats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <Icon size={18} className={color} />
            <div>
              <p className="text-base font-bold text-slate-800">{value}</p>
              <p className="text-[10px] text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[70%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-slate-800 text-white rounded-tr-sm"
                      : "bg-slate-100 text-slate-700 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div className="px-5 pb-3 flex gap-2 flex-wrap border-t border-slate-100 pt-3">
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-5 pb-5">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Ask about system status, users, or metrics..."
              className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}