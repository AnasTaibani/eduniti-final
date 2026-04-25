import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Trophy, Lock } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const GRADE_SUBJECTS = {
  Grade_6: ["Arts","English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
  Grade_7: ["Arts","English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
  Grade_8: ["Arts","English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
  Grade_9: ["English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
  Grade_10: ["English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
  Grade_11: ["Accountancy","Biology","Business_Studies","Chemistry","Computer_Science","Economics","English","Geography","Hindi","Mathematics","Physics","Political_Science","Psychology","Sanskrit","Sociology"],
  Grade_12: ["Accountancy","Biology","Business_Studies","Chemistry","Computer_Science","Economics","English","Geography","Hindi","History","Mathematics","Physics","Political_Science","Psychology","Sanskrit","Sociology"],
};

const GuestQuizPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("setup");
  const [loading, setLoading] = useState(false);
  const [grade, setGrade] = useState("Grade_10");
  const [quizConfig, setQuizConfig] = useState({ topic: "", subject: "", numQuestions: 5 });
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);

  const subjects = GRADE_SUBJECTS[grade] || [];

  const handleGradeChange = (newGrade) => {
    setGrade(newGrade);
    setQuizConfig({ ...quizConfig, subject: "" });
  };

  const generateQuiz = async (e) => {
    e.preventDefault();
    if (!quizConfig.topic || !quizConfig.subject) { toast.error("Fill all fields"); return; }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/guest/quiz/generate`, {
        topic: quizConfig.topic, subject: quizConfig.subject, grade, num_questions: quizConfig.numQuestions
      });
      setQuiz(response.data);
      setAnswers(new Array(response.data.questions.length).fill(-1));
      setStep("quiz");
    } catch (error) { toast.error("Failed to generate quiz"); }
    finally { setLoading(false); }
  };

  const getScore = () => {
    if (!quiz) return { correct: 0, total: 0, score: 0 };
    const correct = quiz.questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_answer ? 1 : 0), 0);
    return { correct, total: quiz.questions.length, score: (correct / quiz.questions.length) * 100 };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" data-testid="guest-quiz-page">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4 mr-2" /> Home</Button>
          <h1 className="text-lg font-bold" style={{ color: "#0F172A" }}>Try Quiz</h1>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8 max-w-3xl">
        {step === "setup" && (
          <Card className="shadow-md" data-testid="guest-quiz-setup">
            <CardHeader>
              <CardTitle className="text-2xl">Generate Quiz</CardTitle>
              <CardDescription>Try a free quiz on any NCERT topic</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generateQuiz} className="space-y-5">
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select value={grade} onValueChange={handleGradeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(GRADE_SUBJECTS).map(g => <SelectItem key={g} value={g}>{g.replace("_"," ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Input placeholder="e.g., Photosynthesis, Quadratic Equations" value={quizConfig.topic}
                    onChange={(e) => setQuizConfig({...quizConfig, topic: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={quizConfig.subject} onValueChange={(v) => setQuizConfig({...quizConfig, subject: v})}>
                    <SelectTrigger data-testid="guest-subject-select"><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate Quiz"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "quiz" && quiz && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{color:"#0F172A"}}>Question {currentQuestion + 1} / {quiz.questions.length}</h2>
              <span className="text-sm text-slate-500">{answers.filter(a => a !== -1).length} answered</span>
            </div>
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-lg">{quiz.questions[currentQuestion].question}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <RadioGroup value={String(answers[currentQuestion])} onValueChange={(v) => { const a = [...answers]; a[currentQuestion] = parseInt(v); setAnswers(a); }}>
                  {quiz.questions[currentQuestion].options.map((opt, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 border-2 border-slate-200 rounded-xl hover:border-sky-400 transition-all">
                      <RadioGroupItem value={String(idx)} id={`opt-${idx}`} />
                      <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentQuestion(p => Math.max(0, p - 1))} disabled={currentQuestion === 0}>Previous</Button>
              {currentQuestion < quiz.questions.length - 1 ? (
                <Button onClick={() => setCurrentQuestion(p => p + 1)}>Next</Button>
              ) : (
                <Button onClick={() => { if (answers.some(a => a === -1)) { toast.error("Answer all questions"); return; } setStep("result"); }} className="bg-amber-500 hover:bg-amber-600">
                  Finish Quiz
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "result" && quiz && (
          <Card className="shadow-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-sky-50 rounded-xl"><div className="text-2xl font-bold text-sky-600">{getScore().score.toFixed(0)}%</div><div className="text-xs text-slate-500">Score</div></div>
                <div className="p-3 bg-green-50 rounded-xl"><div className="text-2xl font-bold text-green-600">{getScore().correct}</div><div className="text-xs text-slate-500">Correct</div></div>
                <div className="p-3 bg-red-50 rounded-xl"><div className="text-2xl font-bold text-red-600">{getScore().total - getScore().correct}</div><div className="text-xs text-slate-500">Wrong</div></div>
              </div>
              <div className="space-y-2">
                {quiz.questions.map((q, idx) => {
                  const isCorrect = answers[idx] === q.correct_answer;
                  return (
                    <div key={idx} className={`p-3 rounded-xl border ${isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{q.question}</p>
                          <p className="text-xs text-slate-600">Correct: <b>{q.options[q.correct_answer]}</b></p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Card className="border-2 border-sky-200 bg-sky-50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-sky-600" /><span className="text-sm text-sky-800 font-medium">Sign up to track progress & unlock all features</span></div>
                  <Button onClick={() => navigate("/")} size="sm" className="rounded-full" data-testid="signup-cta">Sign Up</Button>
                </CardContent>
              </Card>
              <Button onClick={() => { setStep("setup"); setQuiz(null); setAnswers([]); setCurrentQuestion(0); }} className="w-full rounded-full">Try Another Quiz</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GuestQuizPage;
