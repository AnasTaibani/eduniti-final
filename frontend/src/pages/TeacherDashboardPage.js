import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Users, LogOut, User, TrendingUp, AlertTriangle, CheckCircle, Send, Loader2, BarChart3, Flame, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const TeacherDashboardPage = () => {
  const navigate = useNavigate();
  const { student, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [classAnalytics, setClassAnalytics] = useState(null);
  const [view, setView] = useState("class");
  const [assignForm, setAssignForm] = useState({ topic: "", subject: "", num_questions: 5 });
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { fetchStudents(); fetchClassAnalytics(); }, []);

  const fetchStudents = async () => {
    try { const res = await axios.get(`${API}/teacher/students`); setStudents(res.data); }
    catch (e) { console.error(e); }
  };

  const fetchClassAnalytics = async () => {
    try { const res = await axios.get(`${API}/teacher/class-analytics`); setClassAnalytics(res.data); }
    catch (e) { console.error(e); }
  };

  const viewStudent = async (studentId) => {
    try {
      const res = await axios.get(`${API}/teacher/student/${studentId}`);
      setStudentDetail(res.data);
      setSelectedStudent(studentId);
      setView("student");
    } catch (e) { toast.error("Failed to load student"); }
  };

  const assignQuiz = async () => {
    if (!assignForm.topic || !assignForm.subject) { toast.error("Fill all fields"); return; }
    setAssigning(true);
    try {
      await axios.post(`${API}/teacher/assign-quiz`, { student_id: selectedStudent, ...assignForm });
      toast.success("Quiz assigned!");
      setAssignForm({ topic: "", subject: "", num_questions: 5 });
    } catch (e) { toast.error("Failed to assign quiz"); }
    finally { setAssigning(false); }
  };

  const handleLogout = () => { logout(); navigate("/teacher"); };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="teacher-dashboard">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center"><GraduationCap className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold" style={{color:"#0F172A"}}>Teacher Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium" style={{color:"#0F172A"}}>{student?.name}</p>
              <p className="text-xs text-slate-500">{student?.grade?.replace("_"," ")} - {student?.subject?.replace(/_/g," ")}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="teacher-logout"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {view === "class" && (
          <>
            {/* Class Overview */}
            <div className="grid md:grid-cols-3 gap-5 mb-8">
              <Card className="border border-slate-200" data-testid="total-students-card">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-100 rounded-2xl flex items-center justify-center"><Users className="w-6 h-6 text-sky-600" /></div>
                  <div><div className="text-2xl font-bold" style={{color:"#0F172A"}}>{classAnalytics?.total_students || 0}</div><div className="text-sm text-slate-500">Students</div></div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Class Weak Topics</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  {classAnalytics?.weak_topics?.slice(0, 3).map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-sm text-slate-700">{t.topic}</span>
                      <span className="text-xs font-medium text-amber-600">{t.avg_mastery}%</span>
                    </div>
                  )) || <span className="text-sm text-slate-400">No data yet</span>}
                </CardContent>
              </Card>
              <Card className="border border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Class Strong Topics</span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                  {classAnalytics?.strong_topics?.slice(0, 3).map((t, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-sm text-slate-700">{t.topic}</span>
                      <span className="text-xs font-medium text-emerald-600">{t.avg_mastery}%</span>
                    </div>
                  )) || <span className="text-sm text-slate-400">No data yet</span>}
                </CardContent>
              </Card>
            </div>

            {/* Student List */}
            <Card className="border border-slate-200" data-testid="student-list">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Students in {student?.grade?.replace("_"," ")}</CardTitle>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No students registered in this grade yet</p>
                ) : (
                  <div className="space-y-2">
                    {students.map((s) => (
                      <div key={s.id} onClick={() => viewStudent(s.id)}
                        className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:border-sky-200 hover:bg-sky-50/50 cursor-pointer transition-all"
                        data-testid={`student-row-${s.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center"><User className="w-4 h-4 text-slate-500" /></div>
                          <div>
                            <p className="text-sm font-medium" style={{color:"#0F172A"}}>{s.name}</p>
                            <p className="text-xs text-slate-400">{s.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div><span className="text-sm font-medium text-sky-600">{s.avg_mastery}%</span><p className="text-xs text-slate-400">Mastery</p></div>
                          <div><span className="text-sm font-medium text-amber-600">{s.quiz_count}</span><p className="text-xs text-slate-400">Quizzes</p></div>
                          <div className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-orange-500" /><span className="text-sm font-medium">{s.streak}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {view === "student" && studentDetail && (
          <>
            <Button variant="ghost" size="sm" onClick={() => { setView("class"); setStudentDetail(null); }} className="mb-4" data-testid="back-to-class"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Class</Button>

            <div className="grid md:grid-cols-3 gap-5 mb-6">
              <Card className="border border-slate-200 md:col-span-2">
                <CardContent className="p-5">
                  <h2 className="text-xl font-bold mb-1" style={{color:"#0F172A"}}>{studentDetail.student.name}</h2>
                  <p className="text-sm text-slate-500 mb-3">{studentDetail.student.email}</p>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-xs">{studentDetail.student.grade?.replace("_"," ")}</span>
                    <span className="flex items-center gap-1 text-sm"><Flame className="w-3.5 h-3.5 text-orange-500" /> {studentDetail.streak?.current_streak || 0} day streak</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-emerald-200 bg-emerald-50" data-testid="assign-quiz-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-800">Assign Quiz</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Input placeholder="Topic (e.g., Photosynthesis)" value={assignForm.topic} onChange={e => setAssignForm({...assignForm, topic: e.target.value})} className="h-8 text-sm" data-testid="assign-topic-input" />
                  <Input placeholder="Subject" value={assignForm.subject} onChange={e => setAssignForm({...assignForm, subject: e.target.value})} className="h-8 text-sm" data-testid="assign-subject-input" />
                  <Button size="sm" onClick={assignQuiz} disabled={assigning} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-1" data-testid="assign-quiz-btn">
                    {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Assign
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Mastery */}
            <Card className="border border-slate-200 mb-6" data-testid="student-mastery">
              <CardHeader className="pb-3"><CardTitle className="text-base">Topic Mastery</CardTitle></CardHeader>
              <CardContent>
                {studentDetail.mastery.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No mastery data yet</p>
                ) : (
                  <div className="space-y-3">
                    {studentDetail.mastery.map((m, i) => {
                      const pct = (m.mastery_level * 100).toFixed(0);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-sm w-32 truncate" style={{color:"#0F172A"}}>{m.concept_name}</span>
                          <div className="flex-1"><div className="w-full bg-slate-100 rounded-full h-2"><div className={`h-2 rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{width: `${pct}%`}} /></div></div>
                          <span className="text-sm font-medium w-10 text-right" style={{color:"#0F172A"}}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Quiz Results */}
            <Card className="border border-slate-200" data-testid="student-quiz-results">
              <CardHeader className="pb-3"><CardTitle className="text-base">Recent Quizzes</CardTitle></CardHeader>
              <CardContent>
                {studentDetail.quiz_results.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No quizzes taken yet</p>
                ) : (
                  <div className="space-y-2">
                    {studentDetail.quiz_results.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-lg">
                        <span className="text-sm" style={{color:"#0F172A"}}>{r.topic}</span>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-medium ${r.score >= 80 ? "text-emerald-600" : r.score >= 50 ? "text-amber-600" : "text-red-600"}`}>{r.score.toFixed(0)}%</span>
                          <span className="text-xs text-slate-400">{r.correct_answers}/{r.total_questions}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
