import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Award, Flame, BarChart3, Trophy, Star, Zap, Brain, Timer, Save } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import { useI18n } from "@/i18n";

const BADGE_ICONS = { trophy: Trophy, star: Star, flame: Flame, award: Award, zap: Zap, brain: Brain, timer: Timer };

const ProfilePage = () => {
  const navigate = useNavigate();
  const { student, setStudent } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const [profileRes, badgesRes] = await Promise.all([
        axios.get(`${API}/profile`),
        axios.get(`${API}/progress/badges`)
      ]);
      setProfile(profileRes.data);
      setBadges(badgesRes.data);
      setEditName(profileRes.data.name);
    } catch (e) { console.error(e); }
  };

  const saveName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await axios.put(`${API}/profile`, { name: editName });
      setProfile(prev => ({ ...prev, name: editName }));
      setStudent(prev => ({ ...prev, name: editName }));
      setEditing(false);
      toast.success("Name updated!");
    } catch (e) { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  if (!profile) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div></div>;

  const earnedBadges = badges.filter(b => b.earned);

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="profile-page">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}><ArrowLeft className="w-4 h-4 mr-2" /> {t("dashboard")}</Button>
          <h1 className="text-lg font-bold" style={{color:"#0F172A"}}>{t("profile")}</h1>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-2xl space-y-6">
        {/* Profile Card */}
        <Card className="border border-slate-200" data-testid="profile-card">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 text-sky-600" />
              </div>
              <div className="flex-1">
                {editing ? (
                  <div className="flex gap-2 mb-2">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9 text-sm" data-testid="edit-name-input" />
                    <Button size="sm" onClick={saveName} disabled={saving} data-testid="save-name-btn"><Save className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditName(profile.name); }}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold" style={{color:"#0F172A"}}>{profile.name}</h2>
                    <button onClick={() => setEditing(true)} className="text-xs text-sky-500 hover:underline" data-testid="edit-name-trigger">Edit</button>
                  </div>
                )}
                <p className="text-sm text-slate-500">{profile.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-medium">{profile.grade?.replace("_", " ")}</span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Level {profile.level}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Quizzes", value: profile.total_quizzes, icon: BarChart3, color: "sky" },
            { label: "Mastery", value: `${profile.avg_mastery}%`, icon: Award, color: "amber" },
            { label: "Streak", value: `${profile.streak} days`, icon: Flame, color: "orange" },
            { label: "Badges", value: `${profile.badges_earned}/${badges.length}`, icon: Trophy, color: "emerald" },
          ].map((s, i) => (
            <Card key={i} className="border border-slate-200">
              <CardContent className="p-4 text-center">
                <s.icon className={`w-5 h-5 text-${s.color}-500 mx-auto mb-1`} />
                <div className="text-lg font-bold" style={{color:"#0F172A"}}>{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Badges */}
        <Card className="border border-slate-200" data-testid="profile-badges">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Badges</CardTitle>
            <CardDescription>{earnedBadges.length} earned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {badges.map(badge => {
                const Icon = BADGE_ICONS[badge.icon] || Trophy;
                return (
                  <div key={badge.id} className="text-center">
                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-1 ${badge.earned ? "" : "bg-slate-100"}`}
                      style={badge.earned ? { backgroundColor: badge.color + "15" } : {}}>
                      <Icon className="w-5 h-5" style={{ color: badge.earned ? badge.color : "#CBD5E1" }} />
                    </div>
                    <p className={`text-xs ${badge.earned ? "font-medium" : "text-slate-400"}`}>{badge.name}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
