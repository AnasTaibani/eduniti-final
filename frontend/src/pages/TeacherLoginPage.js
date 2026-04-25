import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/App";

const GRADE_SUBJECTS = {
  Grade_6: ["Arts","English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
  Grade_9: ["English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
  Grade_10: ["English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
  Grade_11: ["Accountancy","Biology","Business_Studies","Chemistry","Computer_Science","Economics","English","Geography","Hindi","Mathematics","Physics","Political_Science","Psychology","Sanskrit","Sociology"],
  Grade_12: ["Accountancy","Biology","Business_Studies","Chemistry","Computer_Science","Economics","English","Geography","Hindi","History","Mathematics","Physics","Political_Science","Psychology","Sanskrit","Sociology"],
};

const TeacherLoginPage = () => {
  const navigate = useNavigate();
  const { login, student, isTeacher } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", email: "", password: "", grade: "", subject: "", access_code: "" });

  if (student && isTeacher) { navigate("/teacher/dashboard"); return null; }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/teacher/login`, loginData);
      login(res.data.token, { ...res.data.teacher, role: "teacher" }, true);
      toast.success("Welcome, Teacher!");
      navigate("/teacher/dashboard");
    } catch (error) { toast.error(error.response?.data?.detail || "Login failed"); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.grade || !registerData.subject) { toast.error("Fill all fields"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/teacher/register`, registerData);
      login(res.data.token, { ...res.data.teacher, role: "teacher" }, true);
      toast.success("Teacher account created!");
      navigate("/teacher/dashboard");
    } catch (error) { toast.error(error.response?.data?.detail || "Registration failed"); }
    finally { setLoading(false); }
  };

  const subjects = GRADE_SUBJECTS[registerData.grade] || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6" data-testid="teacher-login-page">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center"><GraduationCap className="w-6 h-6 text-white" /></div>
          </div>
          <CardTitle className="text-xl">Teacher Portal</CardTitle>
          <CardDescription>Sign in to manage your class</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5">
              <TabsTrigger value="login" data-testid="teacher-login-tab">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="teacher-register-tab">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4" data-testid="teacher-login-form">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} required data-testid="teacher-login-email" /></div>
                <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} required data-testid="teacher-login-password" /></div>
                <Button type="submit" className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700" disabled={loading} data-testid="teacher-login-submit">{loading ? "Logging in..." : "Login"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4" data-testid="teacher-register-form">
                <div className="space-y-1.5"><Label>Name</Label><Input value={registerData.name} onChange={e => setRegisterData({...registerData, name: e.target.value})} required data-testid="teacher-reg-name" /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={registerData.email} onChange={e => setRegisterData({...registerData, email: e.target.value})} required data-testid="teacher-reg-email" /></div>
                <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={registerData.password} onChange={e => setRegisterData({...registerData, password: e.target.value})} required data-testid="teacher-reg-password" /></div>
                <div className="space-y-1.5">
                  <Label>Grade (Class you teach)</Label>
                  <Select onValueChange={v => setRegisterData({...registerData, grade: v, subject: ""})}>
                    <SelectTrigger data-testid="teacher-reg-grade"><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>{["Grade_6","Grade_7","Grade_8","Grade_9","Grade_10","Grade_11","Grade_12"].map(g => <SelectItem key={g} value={g}>{g.replace("_"," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Select onValueChange={v => setRegisterData({...registerData, subject: v})}>
                    <SelectTrigger data-testid="teacher-reg-subject"><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Teacher Access Code</Label><Input value={registerData.access_code} onChange={e => setRegisterData({...registerData, access_code: e.target.value})} required placeholder="Enter code provided by admin" data-testid="teacher-reg-code" /></div>
                <Button type="submit" className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700" disabled={loading} data-testid="teacher-reg-submit">{loading ? "Creating..." : "Create Account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
          <Button variant="ghost" onClick={() => navigate("/")} className="w-full mt-3 text-sm text-slate-500" data-testid="back-home">Back to Student Portal</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherLoginPage;
