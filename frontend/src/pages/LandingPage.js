import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Brain, BarChart3, Sparkles, MessageSquare, FileQuestion, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const LandingPage = () => {
  const navigate = useNavigate();
  const { login, student } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "", grade: "" });

  if (student) { navigate("/dashboard"); return null; }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, loginData);
      login(response.data.token, response.data.student);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error) { toast.error(error.response?.data?.detail || "Login failed"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.grade) { toast.error("Please select your grade"); return; }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, registerData);
      login(response.data.token, response.data.student);
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (error) { toast.error(error.response?.data?.detail || "Registration failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {!showAuth ? (
        <>
          <nav className="container mx-auto px-6 py-5 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center"><BookOpen className="w-5 h-5 text-white" /></div>
              <span className="text-xl font-bold" style={{color:"#0F172A"}}>EduNiti</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/guest/chat")} data-testid="try-chat-btn" className="text-slate-600">Try Chat</Button>
              <Button variant="ghost" onClick={() => navigate("/guest/quiz")} data-testid="try-quiz-btn" className="text-slate-600">Try Quiz</Button>
              <Button variant="ghost" onClick={() => navigate("/teacher")} data-testid="teacher-portal-btn" className="text-slate-500 text-sm">Teacher Portal</Button>
              <Button onClick={() => setShowAuth(true)} data-testid="get-started-btn" className="rounded-full px-6">Get Started</Button>
            </div>
          </nav>

          {/* Hero */}
          <section className="container mx-auto px-6 py-16 lg:py-24">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-100 text-sky-700 rounded-full text-sm font-medium">
                <Sparkles className="w-3.5 h-3.5" /> AI-Powered NCERT Learning
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight" style={{color:"#0F172A"}}>
                Your Personal AI Tutor for <span className="text-sky-500">NCERT Success</span>
              </h1>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Master every concept with personalized AI tutoring, adaptive quizzes, and real-time progress tracking powered by Bayesian Knowledge Tracing.
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button onClick={() => setShowAuth(true)} size="lg" className="rounded-full px-8 gap-2" data-testid="hero-cta-btn">
                  Start Learning Free <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate("/guest/chat")} className="rounded-full px-8 gap-2" data-testid="try-free-btn">
                  <MessageSquare className="w-4 h-4" /> Try Free
                </Button>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="container mx-auto px-6 pb-16">
            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {[
                { icon: Brain, color: "sky", title: "AI Chat Tutor", desc: "Get instant explanations with follow-up questions. Simplify, elaborate, or quiz yourself on any topic." },
                { icon: FileQuestion, color: "amber", title: "Adaptive Quizzes", desc: "AI-generated quizzes that adapt to your grade and learning level. Track response time and mastery." },
                { icon: BarChart3, color: "emerald", title: "Smart Progress", desc: "Bayesian Knowledge Tracing identifies your strengths and weaknesses. Get personalized study recommendations." },
              ].map((f, i) => (
                <Card key={i} className="border border-slate-200 hover:border-sky-300 transition-all hover:shadow-md group" data-testid={`feature-card-${i}`}>
                  <CardHeader>
                    <div className={`w-11 h-11 bg-${f.color}-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <f.icon className={`w-5 h-5 text-${f.color}-600`} />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="container mx-auto px-6 pb-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-10" style={{color:"#0F172A"}}>How It Works</h2>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { step: "01", title: "Sign Up", desc: "Create your account and select your grade" },
                  { step: "02", title: "Ask Questions", desc: "Chat with AI tutor about any NCERT topic" },
                  { step: "03", title: "Take Quizzes", desc: "Test yourself with adaptive quiz generation" },
                  { step: "04", title: "Track Progress", desc: "See your mastery levels and recommendations" },
                ].map((s, i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="w-10 h-10 bg-sky-500 text-white rounded-full flex items-center justify-center mx-auto text-sm font-bold">{s.step}</div>
                    <h3 className="font-semibold" style={{color:"#0F172A"}}>{s.title}</h3>
                    <p className="text-sm text-slate-500">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center"><BookOpen className="w-6 h-6 text-white" /></div>
              </div>
              <CardTitle className="text-xl">Welcome to EduNiti</CardTitle>
              <CardDescription>Sign in or create an account</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-5">
                  <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                  <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                    <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="your@email.com" value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} required data-testid="login-email-input" /></div>
                    <div className="space-y-1.5"><Label>Password</Label><Input type="password" placeholder="Enter password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} required data-testid="login-password-input" /></div>
                    <Button type="submit" className="w-full rounded-full" disabled={loading} data-testid="login-submit-btn">{loading ? "Logging in..." : "Login"}</Button>
                  </form>
                </TabsContent>
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                    <div className="space-y-1.5"><Label>Name</Label><Input placeholder="Your Name" value={registerData.name} onChange={(e) => setRegisterData({...registerData, name: e.target.value})} required data-testid="register-name-input" /></div>
                    <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="your@email.com" value={registerData.email} onChange={(e) => setRegisterData({...registerData, email: e.target.value})} required data-testid="register-email-input" /></div>
                    <div className="space-y-1.5"><Label>Password</Label><Input type="password" placeholder="Create password" value={registerData.password} onChange={(e) => setRegisterData({...registerData, password: e.target.value})} required data-testid="register-password-input" /></div>
                    <div className="space-y-1.5">
                      <Label>Grade</Label>
                      <Select onValueChange={(v) => setRegisterData({...registerData, grade: v})}>
                        <SelectTrigger data-testid="register-grade-select"><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          {["Grade_6","Grade_7","Grade_8","Grade_9","Grade_10","Grade_11","Grade_12"].map(g => (
                            <SelectItem key={g} value={g}>{g.replace("_"," ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full rounded-full" disabled={loading} data-testid="register-submit-btn">{loading ? "Creating..." : "Create Account"}</Button>
                  </form>
                </TabsContent>
              </Tabs>
              <Button variant="ghost" onClick={() => setShowAuth(false)} className="w-full mt-3" data-testid="back-to-home-btn">Back to Home</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
