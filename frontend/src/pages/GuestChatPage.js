import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  Mic,
  Loader2,
  Globe,
  Lock,
  MessageSquare,
  X,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const GUEST_CHAT_LIMIT = 5;

const GuestChatPage = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("english");
  const [grade, setGrade] = useState("Grade_10");
  const [isListening, setIsListening] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [tempSelectedText, setTempSelectedText] = useState("");
  const [selectionPopup, setSelectionPopup] = useState({
    visible: false,
    x: 0,
    y: 0,
  });

  const [chatCount, setChatCount] = useState(() =>
    parseInt(localStorage.getItem("guest_chat_count") || "0")
  );

  const [sessionId] = useState(() => {
    const existing = localStorage.getItem("guest_session_id");
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem("guest_session_id", id);
    return id;
  });

  const loadingMessages = [
    "Thinking like your teacher...",
    "Checking NCERT concepts...",
    "Building an easy explanation...",
    "Preparing examples for you...",
    "Making learning easier for you...",
  ];

  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setCurrentLoadingMessage((prev) =>
          (prev + 1) % loadingMessages.length
        );
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);

      setTimeout(() => {
        document
          .querySelector('[data-testid="send-message-btn"]')
          ?.click();
      }, 500);
    };

    recognition.onerror = () => {
      toast.error("Voice input failed");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setTempSelectedText(text);
      setSelectionPopup({
        visible: true,
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY + 10,
      });
    }
  };

  const handleAskEduniti = () => {
    setSelectedText(tempSelectedText);
    setTempSelectedText("");
    setSelectionPopup({ visible: false, x: 0, y: 0 });
  };

  const clearSelectedText = () => {
    setSelectedText("");
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    if (chatCount >= GUEST_CHAT_LIMIT) {
      toast.error("Free chat limit reached. Please sign up to continue!");
      return;
    }

    const msg = selectedText
      ? `Regarding this text: "${selectedText}"\n\n${input}`
      : input;

    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setInput("");
    setSelectedText("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/guest/chat`, {
        message: msg,
        grade,
        language,
        session_id: sessionId,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.response },
      ]);

      const newCount = chatCount + 1;
      setChatCount(newCount);
      localStorage.setItem("guest_chat_count", String(newCount));
    } catch {
      toast.error("Failed to get response");
    } finally {
      setLoading(false);
    }
  };

  const remaining = GUEST_CHAT_LIMIT - chatCount;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Home
          </Button>

          <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">EN</span>
          </div>

          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Eduniti
          </h1>

          <div className="ml-auto flex items-center gap-3">
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Grade_6", "Grade_7", "Grade_8", "Grade_9", "Grade_10", "Grade_11", "Grade_12"].map((g) => (
                  <SelectItem key={g} value={g}>
                    {g.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[110px] h-8 text-sm">
                <Globe className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-xs px-2 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 font-medium">
              {remaining} chats left
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-4 max-w-4xl">
        <ScrollArea className="h-[calc(100vh-200px)] mb-4">
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-sky-600 text-xl font-bold">EN</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900">
                  Try Eduniti
                </h3>
                <p className="text-slate-500 mb-6">
                  You have {remaining} free chats. Learn smarter with Eduniti!
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                  {["What is photosynthesis?", "Explain quadratic equations", "What causes earthquakes?"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-sky-400 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className="max-w-[75%] bg-white border border-slate-200 rounded-2xl rounded-tr-sm px-5 py-4 shadow-sm">
                    <div className="text-[15px] leading-7 text-slate-700 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div
                      onMouseUp={handleTextSelection}
                      className="prose prose-slate max-w-none"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">EN</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {loadingMessages[currentLoadingMessage]}
                  </p>
                  <p className="text-xs text-slate-400">
                    Preparing the best explanation ✨
                  </p>
                </div>
              </div>
            )}

            {selectionPopup.visible && (
              <div
                className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-2"
                style={{ left: selectionPopup.x, top: selectionPopup.y }}
              >
                <button
                  onClick={handleAskEduniti}
                  className="text-sm font-semibold text-sky-600"
                >
                  Ask Eduniti
                </button>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {chatCount >= GUEST_CHAT_LIMIT ? (
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-600" />
                <p className="text-amber-800 font-medium">
                  Free chats used up. Sign up for unlimited access!
                </p>
              </div>
              <Button onClick={() => navigate("/")}>Sign Up Free</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-slate-200 shadow-md">
            <CardContent className="p-3">
              {selectedText && (
                <div className="mb-3 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="text-sm text-slate-700 truncate">
                    ↳ "{selectedText}"
                  </div>
                  <button type="button" onClick={clearSelectedText}>
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}

              <form onSubmit={sendMessage} className="flex gap-3 items-center">
                <Input
                  placeholder="Ask any NCERT question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />

                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-full ${
                    isListening
                      ? "bg-red-100 text-red-500"
                      : "text-slate-400 hover:text-sky-500"
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>

                <Button
                  type="submit"
                  data-testid="send-message-btn"
                  disabled={loading || !input.trim()}
                  className="rounded-full px-6"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GuestChatPage;
