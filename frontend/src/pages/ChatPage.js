import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Send,
  BookOpen,
  Loader2,
  Lightbulb,
  Search,
  Brain,
  Plus,
  Trash2,
  Globe,
  MessageSquare,
  Paperclip,
  Video,
  X,
  FileText,
  Volume2,
  Square,
  Mic,
  Image as ImageIcon
} from "lucide-react";

const renderMathText = (text) => {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      try { return <BlockMath key={i} math={part.slice(2, -2)} />; } catch { return <span key={i}>{part}</span>; }
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      try { return <InlineMath key={i} math={part.slice(1, -1)} />; } catch { return <span key={i}>{part}</span>; }
    }
    return <span key={i}>{part}</span>;
  });
};

const ActionButtons = ({ onAction, onVideoLecture, loading, t }) => (
  <div className="flex gap-2 mt-3 flex-wrap" data-testid="action-buttons">
    <button onClick={() => onAction("simplify")} disabled={loading} data-testid="simplify-btn"
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-all disabled:opacity-50">
      <Lightbulb className="w-3.5 h-3.5" /> {t("simplify")}
    </button>
    <button onClick={() => onAction("elaborate")} disabled={loading} data-testid="elaborate-btn"
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-all disabled:opacity-50">
      <Search className="w-3.5 h-3.5" /> {t("elaborate")}
    </button>
    <button onClick={() => onAction("quiz")} disabled={loading} data-testid="ask-quiz-btn"
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-all disabled:opacity-50">
      <Brain className="w-3.5 h-3.5" /> {t("ask_quiz_btn")}
    </button>
    <button onClick={onVideoLecture} disabled={loading} data-testid="video-lecture-btn"
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-all disabled:opacity-50">
      <Video className="w-3.5 h-3.5" /> {t("video_lecture")}
    </button>
  </div>
);

const ChatPage = () => {
  const navigate = useNavigate();
  const { student } = useAuth();
  const { t } = useI18n();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(student?.language || "english");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoTopic, setVideoTopic] = useState("");
  const [videoType, setVideoType] = useState("slideshow");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const msgTimestamp = useRef(Date.now());
  const loadingMessages = [
  "Thinking like your teacher...",
  "Checking NCERT concepts...",
  "Fetching from your textbooks...",
  "Building an easy explanation...",
  "Preparing examples for you...",
  "Creating a smarter answer...",
  "Finding the best explanation...",
  "Designing a quick revision trick...",
  "Generating visual learning flow...",
  "Making learning easier for you..."
];
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(0);
  const [selectedText, setSelectedText] = useState("");
  const [tempSelectedText, setTempSelectedText] = useState("");

  const [selectionPopup, setSelectionPopup] = useState({
  visible: false,
  x: 0,
  y: 0,
});
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const getSpeechLanguage = (language) => {
  const map = {
    english: "en-IN",
    hindi: "hi-IN",
    marathi: "mr-IN",
    tamil: "ta-IN",
    telugu: "te-IN",
    bengali: "bn-IN",
    gujarati: "gu-IN",
    kannada: "kn-IN"
  };

  return map[language] || "en-IN";
};
  
  



  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
  let interval;

  if (loading) {
    interval = setInterval(() => {
      setCurrentLoadingMessage((prev) =>
        (prev + 1) % loadingMessages.length
      );
    }, 2000);
  }

  return () => {
    if (interval) clearInterval(interval);
  };
}, [loading]);
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

  setSelectionPopup({
    visible: false,
    x: 0,
    y: 0,
  });

  setTempSelectedText("");
};

const clearSelectedText = () => {
  setSelectedText("");
};

const handleReadAloud = (text, index, language = "en-IN") => {
  if (!text) return;

  // If same message is already speaking → stop it
  if (speakingIndex === index) {
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
    return;
  }

  // Stop any previous speech first
  window.speechSynthesis.cancel();

  const cleanText = text
    .replace(/[#*`>-]/g, "")
    .replace(/\n/g, " ");

  const utterance = new SpeechSynthesisUtterance(cleanText);

  utterance.lang = language;
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

 

  const voices = window.speechSynthesis.getVoices();


  const preferredVoice =
    voices.find(v => v.name.includes("Google हिन्दी")) ||
    voices.find(v => v.name.includes("Google UK English Female")) ||
    voices.find(v => v.name.includes("Female")) ||
    voices.find(v => v.lang.includes("en-IN")) ||
    voices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => {
    setSpeakingIndex(null);
  };

  utterance.onerror = () => {
    setSpeakingIndex(null);
  };

  setSpeakingIndex(index);
  window.speechSynthesis.speak(utterance);
};
  
  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/chat/sessions`);
      setSessions(res.data);
      if (res.data.length > 0 && !activeSessionId) {
        loadSession(res.data[0].id);
      }
    } catch (e) { console.error(e); }
  };

  const loadSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const res = await axios.get(`${API}/chat/sessions/${sessionId}/messages`);
      setMessages(res.data);
    } catch (e) { console.error(e); }
  };

  const createNewSession = async () => {
    try {
      const res = await axios.post(`${API}/chat/sessions`);
      setSessions(prev => [res.data, ...prev]);
      setActiveSessionId(res.data.id);
      setMessages([]);
    } catch (e) { toast.error("Failed to create session"); }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/chat/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (e) { toast.error("Failed to delete"); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpg|jpeg|webp|heic)$/i)) {
      toast.error("Please upload a PDF or image file (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

    // Put voice text inside input
    setInput(transcript);

    // Auto send after short delay
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;

    if (selectedFile) {
      await sendWithFile();
      return;
    }

    const msg = selectedText
      ? `Regarding this text: "${selectedText}"\n\n${input}`
      : input;

    setMessages(prev => [
      ...prev,
      {
      role: "user",
      content: msg
      }
    ]);
    setInput("");
    setSelectedText("");
    setLoading(true);
    msgTimestamp.current = Date.now();
    try {
      const res = await axios.post(`${API}/chat`, { message: msg, session_id: activeSessionId, grade: student?.grade, language });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
      if (!activeSessionId && res.data.session_id) {
        setActiveSessionId(res.data.session_id);
        fetchSessions();
      } else {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: s.title === "New Chat" ? msg.slice(0, 50) : s.title } : s));
      }
    } catch (error) { toast.error("Failed to get response"); }
    finally { setLoading(false); }
  };

  const sendWithFile = async () => {
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("message", input);
    formData.append("session_id", activeSessionId || "");
    formData.append("language", language);

    const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
    const fileIcon = isPdf ? "PDF" : "IMG";
    setMessages(prev => [...prev, { role: "user", content: `[${fileIcon}: ${selectedFile.name}] ${input || "Please explain this content."}` }]);
    setInput("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(true);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat/upload`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
      if (!activeSessionId && res.data.session_id) {
        setActiveSessionId(res.data.session_id);
        fetchSessions();
      }
    } catch (error) { toast.error("Failed to process file"); }
    finally { setUploading(false); setLoading(false); }
  };

  const handleAction = async (action) => {
    const lastAi = [...messages].reverse().find(m => m.role === "assistant");
    if (!lastAi) return;
    const rt = Date.now() - msgTimestamp.current;
    setMessages(prev => [...prev, { role: "user", content: `[${action === "simplify" ? t("simplify") : action === "elaborate" ? t("elaborate") : t("ask_quiz_btn")}]` }]);
    setLoading(true);
    msgTimestamp.current = Date.now();
    try {
      const res = await axios.post(`${API}/chat/action`, { action, last_ai_message: lastAi.content, session_id: activeSessionId, response_time_ms: rt });
      if (action === "quiz" && res.data.quiz) {
        navigate("/quiz", { state: { quizFromChat: res.data.quiz } });
        return;
      }
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
    } catch (error) { toast.error("Action failed"); }
    finally { setLoading(false); }
  };

  const handleVideoLecture = () => {
    const lastAi = [...messages].reverse().find(m => m.role === "assistant");
    if (lastAi) {
      const topicMatch = messages.filter(m => m.role === "user").pop();
      setVideoTopic(topicMatch?.content?.replace(/^\[.*?\]\s*/, '') || "");
    }
    setVideoModalOpen(true);
  };

  const generateVideo = async () => {
    if (!videoTopic.trim()) { toast.error(t("enter_topic")); return; }
    setGeneratingVideo(true);
    try {
      const formData = new FormData();
      formData.append("topic", videoTopic);
      formData.append("video_type", videoType);
      formData.append("session_id", activeSessionId || "");
      const res = await axios.post(`${API}/video/generate`, formData);
      toast.success(`${t("generating_video")} ${videoType === "sora2" ? "(~2-5 min)" : "(~30s)"}`);
      setVideoModalOpen(false);
      setVideoTopic("");
      navigate("/videos");
    } catch (error) { toast.error("Failed to start video generation"); }
    finally { setGeneratingVideo(false); }
  };

  const lastAiIdx = (() => { for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === "assistant") return i; } return -1; })();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex" data-testid="chat-page">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0" data-testid="chat-sidebar">
          <div className="p-4 border-b border-slate-100">
            <Button onClick={createNewSession} className="w-full rounded-lg gap-2" size="sm" data-testid="new-chat-btn">
              <Plus className="w-4 h-4" /> {t("new_chat")}
            </Button>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {sessions.map(s => (
                <div key={s.id} onClick={() => loadSession(s.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group transition-all text-sm ${activeSessionId === s.id ? "bg-sky-50 text-sky-700 border border-sky-200" : "hover:bg-slate-50 text-slate-600"}`}
                  data-testid={`session-${s.id}`}>
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 truncate">{s.title}</span>
                  <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all" data-testid={`delete-session-${s.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="w-full justify-start text-slate-500 text-xs" data-testid="back-to-dashboard-btn">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" /> {t("dashboard")}
            </Button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen">
        <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-slate-600" data-testid="toggle-sidebar">
            <MessageSquare className="w-5 h-5" />
          </button>
          <BookOpen className="w-5 h-5 text-sky-500" />

          <h1
            className="text-lg font-bold tracking-tight"
            style={{ color: "#0F172A" }}
          >
          EduNiti
                </h1>
          <div className="ml-auto flex items-center gap-3">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="language-select">
                <Globe className="w-3 h-3 mr-1" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["english","hindi","tamil","telugu","bengali","marathi","gujarati","kannada"].map(l => (
                  <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-400">{student?.grade?.replace("_", " ")}</span>
          </div>
        </nav>

        <div className="flex-1 overflow-hidden px-6 py-4">
          <ScrollArea className="h-full" data-testid="chat-messages-area">
            <div className="space-y-4 pb-4 max-w-3xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-20" data-testid="empty-chat-state">
                  <div className="w-14 h-14 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-7 h-7 text-sky-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: "#0F172A" }}>{t("ask_ai_tutor")}</h3>
                  <p className="text-slate-400 mb-6 text-sm">{t("ask_any_question")}</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                    {["What is photosynthesis?", "Explain Newton's laws", "What causes earthquakes?"].map(q => (
                      <button key={q} onClick={() => setInput(q)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-500 hover:border-sky-400 transition-all">{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
  <div key={idx}>
    <div
      className={`flex ${
        msg.role === "user" ? "justify-end" : "justify-start"
      } chat-message`}
    >
      {/* AI Avatar */}

      {/* USER MESSAGE */}
      {msg.role === "user" ? (
        <div className="max-w-[70%] bg-white border border-slate-200 rounded-2xl rounded-tr-sm px-5 py-4 shadow-sm">
          <div className="text-[15px] leading-7 text-slate-700 whitespace-pre-wrap">
            {msg.content}
          </div>
        </div>
      ) : (
        /* AI MESSAGE */
        <div className="flex-1 min-w-0 max-w-none">
          <div onMouseUp={handleTextSelection}
            className="
              prose prose-slate max-w-none
              prose-headings:mt-6
              prose-headings:mb-3
              prose-headings:font-bold
              prose-h1:text-2xl
              prose-h2:text-xl
              prose-h3:text-lg

              prose-p:my-4
              prose-p:leading-8
              prose-p:text-[15px]

              prose-ul:my-4
              prose-ol:my-4
              prose-li:my-2

              prose-strong:text-sky-700

              prose-blockquote:border-l-4
              prose-blockquote:border-sky-400
              prose-blockquote:pl-4
              prose-blockquote:italic

              prose-pre:bg-slate-100
              prose-pre:rounded-xl
              prose-pre:p-4

              prose-code:text-purple-600

              prose-table:my-8
              prose-table:w-full
              prose-table:border-collapse
              prose-table:overflow-hidden
              prose-table:rounded-xl

              prose-thead:border
              prose-thead:border-slate-300

              prose-th:border
              prose-th:border-slate-300
              prose-th:bg-slate-100
              prose-th:px-5
              prose-th:py-3
              prose-th:text-left
              prose-th:font-semibold

              prose-td:border
              prose-td:border-slate-200
              prose-td:px-5
              prose-td:py-3
              prose-td:align-top
            "
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>

    {msg.role === "assistant" && (
  <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
                handleReadAloud(
                msg.content,
                idx,
                getSpeechLanguage(language)
              )
            }
          >
            <Volume2 className="w-4 h-4" />
            {speakingIndex === idx ? "⏹ Stop Reading" : "Read Aloud"}
      </Button>
  </div>
)}

    {/* Action Buttons */}
    {msg.role === "assistant" &&
      idx === lastAiIdx &&
      !loading && (
        <div className="ml-14">
          <ActionButtons
            onAction={handleAction}
            onVideoLecture={handleVideoLecture}
            loading={loading}
            t={t}
          />
        </div>
      )}
  </div>
))}

{/* LOADING STATE */}
{loading && (
  <div className="flex justify-start">
    {/* AI Avatar */}
    <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center mr-4 mt-1 flex-shrink-0 shadow-sm">
      <span className="text-white text-xs font-bold">EN</span>
    </div>

    {/* Loading Message Box */}
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-700">
        {uploading
          ? "Analyzing your file..."
          : loadingMessages[currentLoadingMessage]}
      </p>

      <p className="text-xs text-slate-400">
        Please wait while your AI tutor prepares the best explanation ✨
      </p>
    </div>
  </div>
)}

{selectionPopup.visible && (
  <div
    className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-2"
    style={{
      left: selectionPopup.x,
      top: selectionPopup.y,
    }}
  >
    <button
      onClick={handleAskEduniti}
      className="text-sm font-semibold text-sky-600 hover:text-sky-700"
    >
      Ask Eduniti
    </button>
  </div>
)}


<div ref={scrollRef} />

            </div>
          </ScrollArea>
        </div>

        {/* File Preview */}
        {selectedFile && (
          <div className="px-6 pb-1">
            <div className="max-w-3xl mx-auto flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-lg">
              {selectedFile.type.includes('pdf') ? <FileText className="w-4 h-4 text-red-500" /> : <ImageIcon className="w-4 h-4 text-blue-500" />}
              <span className="text-sm text-slate-700 flex-1 truncate">{selectedFile.name}</span>
              <button onClick={removeFile} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        <div className="px-6 pb-4">
          <Card className="border border-slate-200 shadow-sm max-w-3xl mx-auto">
            <CardContent className="p-3">
              {selectedText && (
              <div className="mb-3 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="text-sm text-slate-700 truncate">
              ↳ "{selectedText}"
              </div>

              <button
              type="button"
              onClick={clearSelectedText}
              className="text-slate-400 hover:text-red-500 ml-3"
              >
              <X className="w-4 h-4" />
    </button>
  </div>
)}
              <form
              onSubmit={sendMessage}
              className="flex gap-2 items-center"
            >
              {/* Upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-sky-500 rounded-lg"
              >
                <Paperclip className="w-5 h-5" />
              </button>

             

              {/* Input */}
              <Input
                placeholder="Ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
              />

               {/* Mic */}
              <button
                type="button"
                onClick={handleVoiceInput}
                className="p-2 text-slate-500 hover:text-sky-600 rounded-lg"
              >
                <Mic className="w-5 h-5 text-slate-600" />
              </button>

              {/* Send */}
              <Button
                type="submit"
                className="rounded-full px-5"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Video Lecture Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" data-testid="video-modal">
          <Card className="w-full max-w-md mx-4 shadow-xl border-0">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: "#0F172A" }}>{t("generate_video_lecture")}</h3>
                <button onClick={() => setVideoModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
              </div>
              <Input placeholder={t("enter_topic")} value={videoTopic} onChange={e => setVideoTopic(e.target.value)} data-testid="video-topic-input" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setVideoType("slideshow")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${videoType === "slideshow" ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:border-slate-300"}`}
                  data-testid="video-type-slideshow">
                  <div className="text-sm font-medium" style={{color:"#0F172A"}}>{t("slideshow")}</div>
                  <div className="text-xs text-slate-400">{t("slideshow_desc")}</div>
                </button>
                <button onClick={() => setVideoType("sora2")}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${videoType === "sora2" ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:border-slate-300"}`}
                  data-testid="video-type-sora2">
                  <div className="text-sm font-medium" style={{color:"#0F172A"}}>{t("ai_video")}</div>
                  <div className="text-xs text-slate-400">{t("ai_video_desc")}</div>
                </button>
              </div>
              <Button onClick={generateVideo} disabled={generatingVideo || !videoTopic.trim()} className="w-full rounded-full bg-purple-600 hover:bg-purple-700 gap-2" data-testid="generate-video-btn">
                {generatingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {generatingVideo ? t("generating_video") : t("generate_video_lecture")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
