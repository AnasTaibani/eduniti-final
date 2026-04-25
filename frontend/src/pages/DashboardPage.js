import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, FileQuestion, TrendingUp, LogOut, BookOpen, Flame, Trophy, Star, Zap, Award, Brain, Timer, Settings, User, Video } from "lucide-react";
import axios from "axios";
import { API } from "@/App";
import { useI18n } from "@/i18n";

const BADGE_ICONS = { trophy: Trophy, star: Star, flame: Flame, award: Award, zap: Zap, brain: Brain, timer: Timer };

const DashboardPage = () => {
  const navigate = useNavigate();
  const { student, logout } = useAuth();
  const { t } = useI18n();
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [streakRes, badgesRes] = await Promise.all([
          axios.get(`${API}/progress/streak`),
          axios.get(`${API}/progress/badges`)
        ]);
        setStreak(streakRes.data);
        setBadges(badgesRes.data);
      } catch (error) { console.error(error); }
    };
    fetchData();
  }, []);

  const handleLogout = () => { logout(); navigate("/"); };
  const earnedBadges = badges.filter(b => b.earned);

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="dashboard-page">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center"><BookOpen className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold" style={{color:"#0F172A"}}>EduNiti</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} data-testid="nav-profile-btn" className="text-slate-500">
              <User className="w-4 h-4 mr-1" /> {t("profile")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} data-testid="nav-settings-btn" className="text-slate-500">
              <Settings className="w-4 h-4 mr-1" /> {t("settings")}
            </Button>
            <div className="text-right">
              <p className="text-sm font-medium" style={{color:"#0F172A"}}>{student?.name}</p>
              <p className="text-xs text-slate-500">{student?.grade?.replace('_', ' ')}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-4 h-4 mr-1" /> {t("logout")}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-1" style={{color:"#0F172A"}}>{t("welcome_back")} {student?.name}!</h2>
          <p className="text-slate-500">{t("ready_to_learn")}</p>
        </div>

        {/* Streak + Badges Row */}
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          <Card className="border border-slate-200" data-testid="streak-card">
            <CardContent className="p-5 flex items-center gap-5">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Flame className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <div className="text-3xl font-bold" style={{color:"#0F172A"}}>{streak.current_streak}</div>
                <div className="text-sm text-slate-500">{t("day_streak")}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-lg font-semibold text-slate-400">{streak.longest_streak}</div>
                <div className="text-xs text-slate-400">{t("best")}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200" data-testid="badges-summary-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">{t("badges_earned")}</span>
                <span className="text-sm font-bold" style={{color:"#0F172A"}}>{earnedBadges.length}/{badges.length}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {badges.map((badge) => {
                  const Icon = BADGE_ICONS[badge.icon] || Trophy;
                  return (
                    <div key={badge.id} title={badge.earned ? `${badge.name}: ${badge.description}` : `${badge.name} (Locked)`}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${badge.earned ? "shadow-sm" : "bg-slate-100 opacity-40"}`}
                      style={badge.earned ? { backgroundColor: badge.color + "20" } : {}}
                      data-testid={`badge-${badge.id}`}>
                      <Icon className="w-4 h-4" style={{ color: badge.earned ? badge.color : "#94A3B8" }} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { icon: MessageSquare, color: "sky", title: t("ai_tutor"), desc: t("ai_tutor_desc"), btnText: t("start_chatting"), path: "/chat", testid: "nav-chat-card" },
            { icon: FileQuestion, color: "amber", title: t("take_quiz"), desc: t("take_quiz_desc"), btnText: t("generate_quiz"), path: "/quiz", testid: "nav-quiz-card" },
            { icon: TrendingUp, color: "emerald", title: t("progress"), desc: t("progress_desc"), btnText: t("view_progress"), path: "/progress", testid: "nav-progress-card" },
            { icon: Video, color: "purple", title: t("video_lectures"), desc: t("video_lectures_desc"), btnText: t("view_videos"), path: "/videos", testid: "nav-video-card" },
          ].map((item) => (
            <Card key={item.path} className="border border-slate-200 hover:border-sky-300 transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5"
              onClick={() => navigate(item.path)} data-testid={item.testid}>
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 bg-${item.color}-100 rounded-2xl flex items-center justify-center mb-3`}>
                  <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <CardDescription>{item.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full rounded-full" variant={item.color === "amber" ? "secondary" : "default"} data-testid={`start-${item.path.slice(1)}-btn`}>
                  {item.btnText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
