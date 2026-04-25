import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Globe, Target, Gauge, FileQuestion, Save } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import { useI18n } from "@/i18n";

const LANGUAGES = ["english","hindi","tamil","telugu","bengali","marathi","gujarati","kannada"];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { student, setStudent } = useAuth();
  const { t } = useI18n();
  const [settings, setSettings] = useState({
    language: student?.language || "english",
    daily_goal_minutes: student?.daily_goal_minutes || 30,
    difficulty_level: student?.difficulty_level || "medium",
    quiz_question_count: student?.quiz_question_count || 5
  });
  const [saving, setSaving] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings`, settings);
      setStudent(prev => ({ ...prev, ...settings }));
      localStorage.setItem("eduniti_lang", settings.language);
      toast.success(t("settings_saved"));
    } catch (error) { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="settings-page">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}><ArrowLeft className="w-4 h-4 mr-2" /> {t("dashboard")}</Button>
          <h1 className="text-lg font-bold" style={{color:"#0F172A"}}>{t("settings")}</h1>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-2xl space-y-6">
        {/* Language */}
        <Card className="border border-slate-200" data-testid="language-settings">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-sky-500" /> {t("language_preferences")}</CardTitle>
            <CardDescription>{t("language_pref_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {LANGUAGES.map(lang => (
                <button key={lang} onClick={() => setSettings({...settings, language: lang})}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${settings.language === lang ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                  data-testid={`lang-${lang}`}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Study Settings */}
        <Card className="border border-slate-200" data-testid="study-settings">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" /> {t("study_settings")}</CardTitle>
            <CardDescription>{t("study_settings_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm">{t("daily_study_goal")}</Label>
              <Select value={String(settings.daily_goal_minutes)} onValueChange={v => setSettings({...settings, daily_goal_minutes: parseInt(v)})}>
                <SelectTrigger data-testid="daily-goal-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{t("difficulty_level")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {[{v:"easy",l:t("easy"),d:t("easy_desc")},{v:"medium",l:t("medium"),d:t("medium_desc")},{v:"hard",l:t("hard"),d:t("hard_desc")}].map(opt => (
                  <button key={opt.v} onClick={() => setSettings({...settings, difficulty_level: opt.v})}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${settings.difficulty_level === opt.v ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:border-slate-300"}`}
                    data-testid={`difficulty-${opt.v}`}>
                    <div className="text-sm font-medium" style={{color:"#0F172A"}}>{opt.l}</div>
                    <div className="text-xs text-slate-400">{opt.d}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Settings */}
        <Card className="border border-slate-200" data-testid="quiz-settings">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FileQuestion className="w-4 h-4 text-emerald-500" /> {t("quiz_settings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm">{t("default_questions")}</Label>
              <Select value={String(settings.quiz_question_count)} onValueChange={v => setSettings({...settings, quiz_question_count: parseInt(v)})}>
                <SelectTrigger data-testid="quiz-count-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 questions</SelectItem>
                  <SelectItem value="5">5 questions</SelectItem>
                  <SelectItem value="10">10 questions</SelectItem>
                  <SelectItem value="15">15 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button onClick={saveSettings} className="w-full rounded-full gap-2" disabled={saving} data-testid="save-settings-btn">
          <Save className="w-4 h-4" /> {saving ? t("saving") : t("save_settings")}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
