import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, Award, Target, BarChart3, Flame, Lightbulb, AlertTriangle, CheckCircle, Trophy, Star, Zap, Brain, Timer } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import axios from "axios";
import { API } from "@/App";
import { useI18n } from "@/i18n";

const BADGE_ICONS = { trophy: Trophy, star: Star, flame: Flame, award: Award, zap: Zap, brain: Brain, timer: Timer };

const ProgressPage = () => {
  const navigate = useNavigate();
  const { student } = useAuth();
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState(null);
  const [mastery, setMastery] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [badges, setBadges] = useState([]);
  const [subjectProgress, setSubjectProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, masteryRes, recsRes, streakRes, badgesRes] = await Promise.all([
        axios.get(`${API}/progress/analytics`),
        axios.get(`${API}/progress/mastery`),
        axios.get(`${API}/progress/recommendations`),
        axios.get(`${API}/progress/streak`),
        axios.get(`${API}/progress/badges`),
      ]);
      setAnalytics(analyticsRes.data);
      setMastery(masteryRes.data);
      setRecommendations(recsRes.data);
      setStreak(streakRes.data);
      setBadges(badgesRes.data);
      setSubjectProgress(subjectRes.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div></div>;

  const chartData = analytics?.recent_results?.slice().reverse().map((r, i) => ({ name: `Q${i+1}`, score: r.score })) || [];
  const masteryData = mastery.map((m) => ({ name: m.concept_name, mastery: (m.mastery_level * 100).toFixed(0) }));
  const earnedBadges = badges.filter(b => b.earned);

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="progress-page">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-to-dashboard-btn">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("dashboard")}
          </Button>
          <h1 className="text-lg font-bold" style={{color:"#0F172A"}}>{t("learning_progress")}</h1>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* AI Recommendation Banner */}
        {recommendations?.ai_recommendation && (
          <Card className="mb-6 border-sky-200 bg-sky-50" data-testid="ai-recommendation-card">
            <CardContent className="p-5 flex gap-4">
              <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sky-900 mb-1">AI Study Recommendation</h3>
                <p className="text-sm text-sky-800 leading-relaxed">{recommendations.ai_recommendation}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border border-slate-200" data-testid="stat-total-quizzes">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Quizzes</span>
                <BarChart3 className="w-4 h-4 text-sky-500" />
              </div>
              <div className="text-2xl font-bold" style={{color:"#0F172A"}}>{analytics?.total_quizzes || 0}</div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200" data-testid="stat-avg-score">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Avg Score</span>
                <Target className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold" style={{color:"#0F172A"}}>{analytics?.average_score || 0}%</div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200" data-testid="stat-avg-mastery">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Mastery</span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold" style={{color:"#0F172A"}}>{analytics?.average_mastery || 0}%</div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200" data-testid="stat-streak">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Streak</span>
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold" style={{color:"#0F172A"}}>{streak.current_streak} days</div>
            </CardContent>
          </Card>
        </div>


       {/* Stats Cards */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  ...
</div>

{/* ✅ ADD SUBJECT PROGRESS HERE */}
<Card className="border border-slate-200 mt-6">
  <CardHeader>
    <CardTitle className="text-base">Subject Progress</CardTitle>
    <CardDescription>Performance across your subjects</CardDescription>
  </CardHeader>

  <CardContent>
    <div className="space-y-4">

      {subjectProgress?.length > 0 ? (
        subjectProgress.map((s, i) => (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">{s.subject}</span>
              <span className="text-sm text-slate-500">{s.progress}%</span>
            </div>

            <Progress value={s.progress} className="h-2" />
          </div>
        ))
      ) : (
        <p className="text-sm text-slate-400">No subject data yet</p>
      )}

    </div>
  </CardContent>
</Card>

{/* Strong + Weak Topics */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
  ...
</div>

        {/* Strong + Weak Topics */}
        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <Card className="border border-slate-200" data-testid="strong-topics-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Strong Topics</CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations?.strong_topics?.length > 0 ? (
                <div className="space-y-2.5">
                  {recommendations.strong_topics.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                      <div>
                        <span className="text-sm font-medium text-emerald-900">{t.concept_name}</span>
                        <span className="text-xs text-emerald-600 ml-2">{t.subject?.replace(/_/g," ")}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{(t.mastery_level * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-400">Complete quizzes to see your strengths</p>}
            </CardContent>
          </Card>

          <Card className="border border-slate-200" data-testid="weak-topics-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Needs Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations?.weak_topics?.length > 0 ? (
                <div className="space-y-2.5">
                  {recommendations.weak_topics.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                      <div>
                        <span className="text-sm font-medium text-amber-900">{t.concept_name}</span>
                        <span className="text-xs text-amber-600 ml-2">{t.subject?.replace(/_/g," ")}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-xs text-amber-700 h-7" onClick={() => navigate("/chat")}>Practice</Button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-400">No weak areas identified yet</p>}
            </CardContent>
          </Card>
        </div>

        {/* Badges */}
        <Card className="border border-slate-200 mb-6" data-testid="badges-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Achievements</CardTitle>
            <CardDescription>{earnedBadges.length} of {badges.length} badges earned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {badges.map((badge) => {
                const Icon = BADGE_ICONS[badge.icon] || Trophy;
                return (
                  <div key={badge.id} className="text-center" data-testid={`badge-${badge.id}`}>
                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-1 ${badge.earned ? "shadow-sm" : "bg-slate-100"}`}
                      style={badge.earned ? { backgroundColor: badge.color + "15" } : {}}>
                      <Icon className="w-5 h-5" style={{ color: badge.earned ? badge.color : "#CBD5E1" }} />
                    </div>
                    <p className={`text-xs ${badge.earned ? "font-medium" : "text-slate-400"}`} style={badge.earned ? {color:"#0F172A"} : {}}>
                      {badge.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {chartData.length > 0 && (
          <Card className="border border-slate-200 mb-6" data-testid="quiz-performance-chart">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-sky-500" /> Quiz Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #E2E8F0", borderRadius: "0.5rem", fontSize: "13px" }} />
                  <Line type="monotone" dataKey="score" stroke="#0EA5E9" strokeWidth={2.5} dot={{ fill: "#0EA5E9", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {masteryData.length > 0 && (
          <Card className="border border-slate-200 mb-6" data-testid="mastery-levels-chart">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Topic Mastery</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={masteryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #E2E8F0", borderRadius: "0.5rem", fontSize: "13px" }} />
                  <Bar dataKey="mastery" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detailed Mastery List */}
        <Card className="border border-slate-200" data-testid="mastery-details-list">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Topics</CardTitle>
          </CardHeader>
          <CardContent>
            {mastery.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6" data-testid="no-mastery-data">Complete quizzes to see topic mastery</p>
            ) : (
              <div className="space-y-3">
                {mastery.map((m, idx) => {
                  const pct = (m.mastery_level * 100).toFixed(0);
                  return (
                    <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl" data-testid={`mastery-item-${idx}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium" style={{color:"#0F172A"}}>{m.concept_name}</span>
                          <span className="text-xs text-slate-400 ml-2">{m.subject?.replace(/_/g," ")}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold" style={{color:"#0F172A"}}>{pct}%</span>
                          <span className="text-xs text-slate-400 ml-1">{m.correct_attempts}/{m.attempts}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full mastery-bar ${pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-sky-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


export default ProgressPage;
