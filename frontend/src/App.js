import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import axios from "axios";
import "@/App.css";
import LandingPage from "@/pages/LandingPage";
import DashboardPage from "@/pages/DashboardPage";
import ChatPage from "@/pages/ChatPage";
import QuizPage from "@/pages/QuizPage";
import ProgressPage from "@/pages/ProgressPage";
import GuestChatPage from "@/pages/GuestChatPage";
import GuestQuizPage from "@/pages/GuestQuizPage";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import TeacherLoginPage from "@/pages/TeacherLoginPage";
import TeacherDashboardPage from "@/pages/TeacherDashboardPage";
import VideoLecturesPage from "@/pages/VideoLecturesPage";
import { I18nProvider } from "@/i18n";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const AuthProvider = ({ children }) => {
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const t = localStorage.getItem("token");
      if (t) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setStudent(response.data);
      setIsTeacher(response.data.role === "teacher");
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken, userData, teacher = false) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setStudent(userData);
    setIsTeacher(teacher);
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setStudent(null);
    setIsTeacher(false);
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ student, token, login, logout, loading, isTeacher, setStudent }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { student, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div></div>;
  return student ? children : <Navigate to="/" replace />;
};

const TeacherRoute = ({ children }) => {
  const { student, loading, isTeacher } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div></div>;
  return student && isTeacher ? children : <Navigate to="/teacher" replace />;
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <I18nProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/guest/chat" element={<GuestChatPage />} />
            <Route path="/guest/quiz" element={<GuestQuizPage />} />
            <Route path="/teacher" element={<TeacherLoginPage />} />
            <Route path="/teacher/dashboard" element={<TeacherRoute><TeacherDashboardPage /></TeacherRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/videos" element={<ProtectedRoute><VideoLecturesPage /></ProtectedRoute>} />
          </Routes>
          </I18nProvider>
        </BrowserRouter>
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}

export default App;
export { API };
