import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Trophy, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";
import { useI18n } from "@/i18n";

const QuizPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { student } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState("setup");
  const [loading, setLoading] = useState(false);
  const [quizConfig, setQuizConfig] = useState({ topic: "", subject: "", numQuestions: 5 });
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [responseTimes, setResponseTimes] = useState([]);
  const [assignedQuizzes, setAssignedQuizzes] = useState([]);
  const questionStartTime = useRef(Date.now());

  useEffect(() => {
    if (student?.grade) fetchSubjects(student.grade);
    fetchAssignedQuizzes();
  }, [student?.grade]);

  const fetchAssignedQuizzes = async () => {
    try {
      const res = await axios.get(`${API}/quiz/assigned`);
      setAssignedQuizzes(res.data);
    } catch (e) { console.error(e); }
  };

  const startAssignedQuiz = (q) => {
    setQuiz(q);
    setAnswers(new Array(q.questions.length).fill(-1));
    setResponseTimes(new Array(q.questions.length).fill(0));
    questionStartTime.current = Date.now();
    setStep("quiz");
  };

  // Auto-start quiz from chat action
  useEffect(() => {
    const quizFromChat = location.state?.quizFromChat;
    if (quizFromChat) {
      setQuiz(quizFromChat);
      setAnswers(new Array(quizFromChat.questions.length).fill(-1));
      setResponseTimes(new Array(quizFromChat.questions.length).fill(0));
      questionStartTime.current = Date.now();
      setStep("quiz");
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchSubjects = async (grade) => {
    try {
      const response = await axios.get(`${API}/subjects/${grade}`);
      setSubjects(response.data.subjects || []);
    } catch (error) {
      setSubjects(["Mathematics", "Science", "English", "Social_Science", "Hindi"]);
    }
  };

  const generateQuiz = async (e) => {
    e.preventDefault();
    if (!quizConfig.topic || !quizConfig.subject) { toast.error("Fill all fields"); return; }
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/quiz/generate?topic=${encodeURIComponent(quizConfig.topic)}&subject=${encodeURIComponent(quizConfig.subject)}&num_questions=${quizConfig.numQuestions}`
      );
      setQuiz(response.data);
      setAnswers(new Array(response.data.questions.length).fill(-1));
      setResponseTimes(new Array(response.data.questions.length).fill(0));
      questionStartTime.current = Date.now();
      setStep("quiz");
    } catch (error) { toast.error("Failed to generate quiz"); }
    finally { setLoading(false); }
  };

  const submitQuiz = async () => {
    if (answers.some((a) => a === -1)) { toast.error("Answer all questions"); return; }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/quiz/submit`, {
        quiz_id: quiz.id, answers, response_times_ms: responseTimes
      });
      setResult(response.data);
      if (response.data.new_badges?.length > 0) {
        toast.success(`New badge earned: ${response.data.new_badges.join(", ")}!`);
      }
      setStep("result");
    } catch (error) { toast.error("Failed to submit quiz"); }
    finally { setLoading(false); }
  };

  const resetQuiz = () => {
    setStep("setup"); setQuiz(null); setCurrentQuestion(0);
    setAnswers([]); setResult(null); setResponseTimes([]);
    setQuizConfig({ topic: "", subject: "", numQuestions: 5 });
    fetchAssignedQuizzes();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="quiz-page">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-to-dashboard-btn">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("dashboard")}
          </Button>
          <h1 className="text-lg font-bold" style={{color:"#0F172A"}}>{t("quiz_center")}</h1>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-3xl">
        {step === "setup" && (
          <>
          {assignedQuizzes.filter(q => !q.completed).length > 0 && (
            <Card className="shadow-md border-amber-200 bg-amber-50/30 mb-6" data-testid="assigned-quizzes-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5 text-amber-600" /> {t("assigned_by_teacher")}</CardTitle>
                <CardDescription>{t("assigned_quiz_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignedQuizzes.filter(q => !q.completed).map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-xl" data-testid={`assigned-quiz-${q.id}`}>
                    <div>
                      <p className="text-sm font-medium" style={{color:"#0F172A"}}>{q.topic}</p>
                      <p className="text-xs text-slate-500">{q.subject?.replace(/_/g," ")} - {q.questions?.length} {t("questions")}</p>
                    </div>
                    <Button size="sm" onClick={() => startAssignedQuiz(q)} className="rounded-full bg-amber-500 hover:bg-amber-600" data-testid={`start-assigned-${q.id}`}>
                      {t("start_quiz")}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card className="shadow-md" data-testid="quiz-setup-card">
            <CardHeader>
              <CardTitle className="text-2xl">Generate New Quiz</CardTitle>
              <CardDescription>Create a personalized quiz for {student?.grade?.replace("_"," ")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generateQuiz} className="space-y-5">
                <div className="space-y-1.5">
                  <Label>Topic</Label>
                  <Input placeholder="e.g., Photosynthesis, Algebra, Indian History" value={quizConfig.topic}
                    onChange={(e) => setQuizConfig({...quizConfig, topic: e.target.value})} required data-testid="quiz-topic-input" />
                </div>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Select onValueChange={(v) => setQuizConfig({...quizConfig, subject: v})} required>
                    <SelectTrigger data-testid="quiz-subject-select"><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Questions</Label>
                  <Select value={String(quizConfig.numQuestions)} onValueChange={(v) => setQuizConfig({...quizConfig, numQuestions: parseInt(v)})}>
                    <SelectTrigger data-testid="quiz-num-questions-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Questions</SelectItem>
                      <SelectItem value="5">5 Questions</SelectItem>
                      <SelectItem value="10">10 Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={loading} data-testid="generate-quiz-btn">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate Quiz"}
                </Button>
              </form>
            </CardContent>
          </Card>
          </>
        )}

        {step === "quiz" && quiz && (
          <div className="space-y-5" data-testid="quiz-questions-container">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{color:"#0F172A"}}>Q{currentQuestion + 1} of {quiz.questions.length}</h2>
              <div className="flex gap-1">
                {quiz.questions.map((_, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${answers[i] !== -1 ? "bg-sky-500" : i === currentQuestion ? "bg-sky-300" : "bg-slate-200"}`} />
                ))}
              </div>
            </div>

            <Card className="shadow-md" data-testid="current-question-card">
              <CardHeader><CardTitle className="text-lg leading-relaxed">{quiz.questions[currentQuestion].question}</CardTitle></CardHeader>
              <CardContent className="space-y-2.5">
                <RadioGroup value={String(answers[currentQuestion])} onValueChange={(v) => {
                  const a = [...answers]; a[currentQuestion] = parseInt(v); setAnswers(a);
                  const t = [...responseTimes]; t[currentQuestion] = Date.now() - questionStartTime.current; setResponseTimes(t);
                }}>
                  {quiz.questions[currentQuestion].options.map((opt, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3.5 border-2 border-slate-200 rounded-xl hover:border-sky-400 transition-all quiz-option" data-testid={`quiz-option-${idx}`}>
                      <RadioGroupItem value={String(idx)} id={`option-${idx}`} />
                      <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-[15px]">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setCurrentQuestion(p => Math.max(0, p-1)); questionStartTime.current = Date.now(); }}
                disabled={currentQuestion === 0} data-testid="prev-question-btn">Previous</Button>
              {currentQuestion < quiz.questions.length - 1 ? (
                <Button onClick={() => { setCurrentQuestion(p => p+1); questionStartTime.current = Date.now(); }} data-testid="next-question-btn">Next</Button>
              ) : (
                <Button onClick={submitQuiz} disabled={loading} className="bg-amber-500 hover:bg-amber-600" data-testid="submit-quiz-btn">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit Quiz"}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "result" && result && (
          <Card className="shadow-md" data-testid="quiz-result-card">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-sky-50 rounded-xl"><div className="text-2xl font-bold text-sky-600">{result.score?.toFixed(0)}%</div><div className="text-xs text-slate-500">Score</div></div>
                <div className="p-3 bg-green-50 rounded-xl"><div className="text-2xl font-bold text-green-600">{result.correct_answers}</div><div className="text-xs text-slate-500">Correct</div></div>
                <div className="p-3 bg-red-50 rounded-xl"><div className="text-2xl font-bold text-red-600">{result.total_questions - result.correct_answers}</div><div className="text-xs text-slate-500">Wrong</div></div>
              </div>
              <div className="space-y-2">
                {quiz.questions.map((q, idx) => {
                  const isCorrect = answers[idx] === q.correct_answer;
                  return (
                    <div key={idx} className={`p-3 rounded-xl border ${isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`} data-testid={`result-question-${idx}`}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{q.question}</p>
                          <p className="text-xs text-slate-600">Correct: <b>{q.options[q.correct_answer]}</b></p>
                          {!isCorrect && <p className="text-xs text-red-600">Your answer: <b>{q.options[answers[idx]]}</b></p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <Button onClick={resetQuiz} className="flex-1 rounded-full" data-testid="take-another-quiz-btn">Another Quiz</Button>
                <Button variant="outline" onClick={() => navigate("/progress")} className="flex-1 rounded-full" data-testid="view-progress-btn">View Progress</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
