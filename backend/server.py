from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, UploadFile, File, Form, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import asyncio
import json
import numpy as np
import faiss
from rank_bm25 import BM25Okapi
import requests
import base64
import pdfplumber
import io
import shutil
from PIL import Image, ImageDraw
from openai import OpenAI
import base64
import edge_tts
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
print("OPENAI KEY:", OPENAI_API_KEY)
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 720))
TEACHER_ACCESS_CODE = os.environ.get('TEACHER_ACCESS_CODE', 'EDUNITI-TEACHER-2026')
client_ai = OpenAI(api_key=OPENAI_API_KEY)

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
VIDEO_DIR = ROOT_DIR / "videos"
VIDEO_DIR.mkdir(exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI()
api_router = APIRouter(prefix="/api")
router = APIRouter()
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Retriever ───
class RetrieverService:
    def __init__(self):
        self.passages = []
        self.bm25 = None
        self.loaded = False

    async def load_data(self):
        if self.loaded:
            return
        try:
            data_url = "https://customer-assets.emergentagent.com/job_fullstack-builder-102/artifacts/zjku0aie_passages.jsonl"
            response = requests.get(data_url, stream=True)
            self.passages = []
            for line in response.iter_lines():
                if line:
                    self.passages.append(json.loads(line.decode('utf-8')))
            logger.info(f"Loaded {len(self.passages)} passages")
            tokenized_corpus = [p['text'].lower().split() for p in self.passages]
            self.bm25 = BM25Okapi(tokenized_corpus)
            self.loaded = True
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            raise

    def retrieve(self, query: str, grade: Optional[str] = None, top_k: int = 5):
        if not self.loaded:
            return []
        scores = self.bm25.get_scores(query.lower().split())
        top_indices = np.argsort(scores)[::-1][:top_k * 4]
        results = []
        for idx in top_indices:
            p = self.passages[idx]
            if grade and p.get('grade') != grade:
                continue
            results.append({'text': p['text'], 'grade': p.get('grade', ''), 'subject': p.get('subject', ''), 'chapter': p.get('chapter', ''), 'score': float(scores[idx])})
            if len(results) >= top_k:
                break
        return results

retriever = RetrieverService()

GRADE_SUBJECTS = {
    "Grade_6": ["Arts","English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
    "Grade_7": ["Arts","English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
    "Grade_8": ["Arts","English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
    "Grade_9": ["English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
    "Grade_10": ["English","Hindi","Mathematics","Sanskrit","Science","Social_Science"],
    "Grade_11": ["Accountancy","Biology","Business_Studies","Chemistry","Computer_Science","Economics","English","Geography","Hindi","Mathematics","Physics","Political_Science","Psychology","Sanskrit","Sociology"],
    "Grade_12": ["Accountancy","Biology","Business_Studies","Chemistry","Computer_Science","Economics","English","Geography","Hindi","History","Mathematics","Physics","Political_Science","Psychology","Sanskrit","Sociology"],
}

BADGE_DEFINITIONS = [
    {"id": "first_quiz", "name": "First Quiz", "description": "Complete your first quiz", "icon": "trophy", "color": "#F59E0B"},
    {"id": "perfect_score", "name": "Perfect Score", "description": "Score 100% on a quiz", "icon": "star", "color": "#10B981"},
    {"id": "streak_3", "name": "3-Day Streak", "description": "Study 3 days in a row", "icon": "flame", "color": "#EF4444"},
    {"id": "streak_7", "name": "Week Warrior", "description": "Study 7 days in a row", "icon": "flame", "color": "#8B5CF6"},
    {"id": "topic_master", "name": "Topic Master", "description": "Reach 80%+ mastery", "icon": "award", "color": "#0EA5E9"},
    {"id": "quiz_5", "name": "Quiz Pro", "description": "Complete 5 quizzes", "icon": "zap", "color": "#F97316"},
    {"id": "chat_explorer", "name": "Curious Mind", "description": "Ask 10 questions", "icon": "brain", "color": "#EC4899"},
    {"id": "speed_demon", "name": "Speed Learner", "description": "All correct under 10s avg", "icon": "timer", "color": "#06B6D4"},
]

LANGUAGES = ["english", "hindi", "tamil", "telugu", "bengali", "marathi", "gujarati", "kannada"]

# ─── Models ───
class StudentRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    grade: str

class StudentLogin(BaseModel):
    email: EmailStr
    password: str

class TeacherRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    grade: str
    subject: str
    access_code: str

class TeacherLogin(BaseModel):
    email: EmailStr
    password: str

class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    grade: str
    role: str = "student"
    language: str = "english"
    daily_goal_minutes: int = 30
    difficulty_level: str = "medium"
    quiz_question_count: int = 5
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    grade: Optional[str] = None
    language: Optional[str] = None

class ChatActionRequest(BaseModel):
    action: str
    last_ai_message: str
    session_id: Optional[str] = None
    response_time_ms: Optional[int] = None

class GuestChatRequest(BaseModel):
    message: str
    grade: str = "Grade_10"
    language: Optional[str] = "english"
    session_id: str

class GuestQuizRequest(BaseModel):
    topic: str
    subject: str
    grade: str = "Grade_10"
    num_questions: int = 5

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int
    topic: str

class Quiz(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    topic: str
    subject: str
    grade: str
    questions: List[QuizQuestion]
    assigned_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuizSubmission(BaseModel):
    quiz_id: str
    answers: List[int]
    response_times_ms: Optional[List[int]] = None

class QuizResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    quiz_id: str
    score: float
    total_questions: int
    correct_answers: int
    topic: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Concept(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    subject: str
    grade: str
    prerequisites: List[str] = Field(default_factory=list)

class MasteryRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    student_id: str
    concept_id: str
    mastery_level: float
    attempts: int = 0
    correct_attempts: int = 0
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    daily_goal_minutes: Optional[int] = None
    difficulty_level: Optional[str] = None
    quiz_question_count: Optional[int] = None

class TeacherAssignQuiz(BaseModel):
    student_id: str
    topic: str
    subject: str
    num_questions: int = 5

# ─── Auth helpers ───
def create_token(user_id: str, role: str = "student") -> str:
    payload = {"sub": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_student(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Student:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid = payload.get("sub")
        role = payload.get("role", "student")
        if role == "teacher":
            teacher_data = await db.teachers.find_one({"id": uid}, {"_id": 0})
            if not teacher_data:
                raise HTTPException(status_code=401, detail="Teacher not found")
            if isinstance(teacher_data.get('created_at'), str):
                teacher_data['created_at'] = datetime.fromisoformat(teacher_data['created_at'])
            teacher_data.setdefault('role', 'teacher')
            teacher_data.setdefault('language', 'english')
            teacher_data.setdefault('daily_goal_minutes', 30)
            teacher_data.setdefault('difficulty_level', 'medium')
            teacher_data.setdefault('quiz_question_count', 5)
            return Student(**teacher_data)
        student_data = await db.students.find_one({"id": uid}, {"_id": 0})
        if not student_data:
            raise HTTPException(status_code=401, detail="Student not found")
        if isinstance(student_data.get('created_at'), str):
            student_data['created_at'] = datetime.fromisoformat(student_data['created_at'])
        student_data.setdefault('role', 'student')
        student_data.setdefault('language', 'english')
        student_data.setdefault('daily_goal_minutes', 30)
        student_data.setdefault('difficulty_level', 'medium')
        student_data.setdefault('quiz_question_count', 5)
        return Student(**student_data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_teacher(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "teacher":
            raise HTTPException(status_code=403, detail="Teacher access required")
        teacher_data = await db.teachers.find_one({"id": payload.get("sub")}, {"_id": 0})
        if not teacher_data:
            raise HTTPException(status_code=401, detail="Teacher not found")
        return teacher_data
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── OpenAI helper ───
def _call_openai(messages, temperature=0.7, max_tokens=700):
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
        json={"model": "gpt-4o-mini", "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
    )
    if response.status_code != 200:
        logger.error(f"OpenAI error: {response.status_code} {response.text[:200]}")
        raise HTTPException(status_code=500, detail="Failed to get AI response")
    return response.json()['choices'][0]['message']['content']

LANG_INSTRUCTIONS = {
    "hindi": "Respond entirely in Hindi (Devanagari script).",
    "tamil": "Respond entirely in Tamil script.",
    "telugu": "Respond entirely in Telugu script.",
    "bengali": "Respond entirely in Bengali script.",
    "marathi": "Respond entirely in Marathi (Devanagari script).",
    "gujarati": "Respond entirely in Gujarati script.",
    "kannada": "Respond entirely in Kannada script.",
}

def _build_system_prompt(grade: str, context_text: str, language: str = "english", difficulty: str = "medium"):
    lang_inst = LANG_INSTRUCTIONS.get(language.lower(), "")
    if lang_inst:
        lang_inst = f"\n- IMPORTANT: {lang_inst}"

    diff_inst = ""
    if difficulty == "easy":
        diff_inst = "\n- Use very simple words and short sentences. Explain like talking to a younger student."
    elif difficulty == "hard":
        diff_inst = "\n- Give advanced, detailed explanations with technical depth. Challenge the student."

    return f"""You are EduNiti, a knowledgeable and friendly AI tutor for {grade.replace('_', ' ')} students studying the NCERT curriculum.

Relevant NCERT Content:
{context_text}

   INSTRUCTIONS:

You are an expert AI Tutor for NCERT students (Grades 6–12).

Your teaching style must feel like ChatGPT:
clear, smart, conversational, engaging, well-structured, and easy to understand.

Never sound like a textbook.
Never sound robotic.
Never give giant boring paragraphs.

Always explain like an excellent real teacher who makes difficult things feel simple.

---

## CORE RULES

* ALWAYS directly explain the topic
* Never refuse
* Never say you lack content
* Use NCERT as reference + your own strong conceptual knowledge
* Explain at {grade.replace('_', ' ')} level
* Use relatable real-life examples
* Focus on conceptual understanding first, exam answer second
* Use simple readable math notation:
  Example: F = m x a
  Never use LaTeX

---

## RESPONSE STYLE (LIKE CHATGPT)

Your answer should feel like premium ChatGPT responses:

* Clear introduction
* Step-by-step explanation
* Natural transitions
* Smart formatting
* Good spacing
* Clean sections
* Helpful summaries
* Smooth flow
* Professional but friendly tone

Student should feel:

“Wow, this is exactly how I wanted it explained.”

---

## FORMATTING RULES

* Use headings with ##
* Use subheadings where useful
* Use bullet points
* Use numbered steps when needed
* Use short paragraphs
* Use spacing between ideas
* Use emojis only where they improve understanding
* Use flowcharts using arrows like →
* Use proper markdown tables
* Use comparison charts where useful
* Use quick summary boxes
* Use memory tricks
* Use exam shortcuts
* Use revision tips

Never overload with too many emojis.

---

## TABLE RULE (VERY IMPORTANT)

Always use proper markdown table syntax:

| Concept | Meaning      | Example            |
| ------- | ------------ | ------------------ |
| Force   | Push or Pull | Kicking a football |

Never create broken plain text tables.

---

## SMART TEACHING RULES

Use these whenever helpful:

1. Mindmap-style explanation
2. Concept maps
3. Flowcharts
4. Real-life relatable examples
5. Comparison tables
6. Exam shortcut sections
7. Memory tricks
8. “Common Mistake Students Make”
9. “1-Line Revision Trick”
10. “Most Expected Exam Question”

---

## ENDING RULE

Always end naturally with ONE of these:

* Want me to explain this with a diagram?
* Want a quick quiz on this?
* Want a 30-second revision trick?
* Want the exam answer version too?

---

## FINAL GOAL

The student should feel:

“Now I truly understand this.”

Not:

“This feels like reading a textbook.”

{lang_inst}

{diff_inst}
"""

async def _build_session_history(student_id: str, session_id: str, limit: int = 10):
    history = await db.chat_messages.find(
        {"student_id": student_id, "session_id": session_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    history.reverse()
    return [{"role": m["role"], "content": m["content"]} for m in history]

# ─── Auth endpoints ───
@api_router.post("/auth/register")
async def register(student: StudentRegister):
    existing = await db.students.find_one({"email": student.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = pwd_context.hash(student.password)
    new_student = Student(name=student.name, email=student.email, grade=student.grade)
    doc = new_student.model_dump()
    doc['password'] = hashed
    doc['created_at'] = doc['created_at'].isoformat()
    await db.students.insert_one(doc)
    await _record_streak(new_student.id)
    return {"token": create_token(new_student.id), "student": new_student}

@api_router.post("/auth/login")
async def login(credentials: StudentLogin):
    student_data = await db.students.find_one({"email": credentials.email}, {"_id": 0})
    if not student_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pwd_context.verify(credentials.password, student_data['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if isinstance(student_data.get('created_at'), str):
        student_data['created_at'] = datetime.fromisoformat(student_data['created_at'])
    student_data.pop('password', None)
    student_data.setdefault('role', 'student')
    student_data.setdefault('language', 'english')
    student_data.setdefault('daily_goal_minutes', 30)
    student_data.setdefault('difficulty_level', 'medium')
    student_data.setdefault('quiz_question_count', 5)
    student = Student(**student_data)
    await _record_streak(student.id)
    return {"token": create_token(student.id), "student": student}

@api_router.get("/auth/me")
async def get_me(current_student: Student = Depends(get_current_student)):
    return current_student

# ─── Teacher Auth ───
@api_router.post("/auth/teacher/register")
async def teacher_register(teacher: TeacherRegister):
    if teacher.access_code != TEACHER_ACCESS_CODE:
        raise HTTPException(status_code=403, detail="Invalid teacher access code")
    existing = await db.teachers.find_one({"email": teacher.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = pwd_context.hash(teacher.password)
    teacher_id = str(uuid.uuid4())
    doc = {"id": teacher_id, "name": teacher.name, "email": teacher.email,
           "grade": teacher.grade, "subject": teacher.subject, "role": "teacher",
           "password": hashed, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.teachers.insert_one(doc)
    doc.pop('password')
    doc.pop('_id', None)
    return {"token": create_token(teacher_id, "teacher"), "teacher": doc}

@api_router.post("/auth/teacher/login")
async def teacher_login(credentials: TeacherLogin):
    teacher_data = await db.teachers.find_one({"email": credentials.email}, {"_id": 0})
    if not teacher_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pwd_context.verify(credentials.password, teacher_data['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    teacher_data.pop('password')
    return {"token": create_token(teacher_data['id'], "teacher"), "teacher": teacher_data}

# ─── Teacher Dashboard ───
@api_router.get("/teacher/students")
async def get_teacher_students(teacher=Depends(get_current_teacher)):
    students = await db.students.find({"grade": teacher['grade']}, {"_id": 0, "password": 0}).to_list(200)
    enriched = []
    for s in students:
        quiz_count = await db.quiz_results.count_documents({"student_id": s['id']})
        mastery_records = await db.mastery.find({"student_id": s['id']}, {"_id": 0}).to_list(100)
        avg_mastery = sum(m['mastery_level'] for m in mastery_records) / len(mastery_records) if mastery_records else 0
        streak_doc = await db.streaks.find_one({"student_id": s['id']}, {"_id": 0})
        enriched.append({
            "id": s['id'], "name": s['name'], "email": s['email'], "grade": s['grade'],
            "quiz_count": quiz_count, "avg_mastery": round(avg_mastery * 100, 1),
            "streak": streak_doc.get("current_streak", 0) if streak_doc else 0
        })
    return enriched

@api_router.get("/teacher/student/{student_id}")
async def get_student_detail(student_id: str, teacher=Depends(get_current_teacher)):
    student_data = await db.students.find_one({"id": student_id}, {"_id": 0, "password": 0})
    if not student_data or student_data.get('grade') != teacher['grade']:
        raise HTTPException(status_code=404, detail="Student not found")
    mastery = await db.mastery.find({"student_id": student_id}, {"_id": 0}).to_list(100)
    enriched_mastery = []
    for m in mastery:
        concept = await db.concepts.find_one({"id": m['concept_id']}, {"_id": 0})
        if concept:
            enriched_mastery.append({**m, "concept_name": concept['name'], "subject": concept['subject']})
    quiz_results = await db.quiz_results.find({"student_id": student_id}, {"_id": 0}).sort("timestamp", -1).limit(20).to_list(20)
    streak = await db.streaks.find_one({"student_id": student_id}, {"_id": 0})
    return {"student": student_data, "mastery": enriched_mastery, "quiz_results": quiz_results,
            "streak": streak or {"current_streak": 0, "longest_streak": 0}}

@api_router.post("/teacher/assign-quiz")
async def teacher_assign_quiz(req: TeacherAssignQuiz, teacher=Depends(get_current_teacher)):
    student = await db.students.find_one({"id": req.student_id}, {"_id": 0})
    if not student or student.get('grade') != teacher['grade']:
        raise HTTPException(status_code=404, detail="Student not found in your class")
    if not retriever.loaded:
        await retriever.load_data()
    grade = student['grade']
    context = retriever.retrieve(req.topic, grade=grade, top_k=5)
    context_text = "\n\n".join([p['text'] for p in context[:3]])
    prompt = f"""Generate {req.num_questions} MCQ for {grade.replace('_', ' ')} on: {req.topic} ({req.subject}).
Content:\n{context_text}
JSON: [{{"question": "?", "options": ["A","B","C","D"], "correct_answer": 0, "topic": "{req.topic}"}}]"""
    content = _call_openai([{"role": "user", "content": prompt}], temperature=0.8, max_tokens=1200)
    start = content.find('[')
    end = content.rfind(']') + 1
    questions_data = json.loads(content[start:end]) if start != -1 and end > start else json.loads(content)
    questions = [QuizQuestion(**q) for q in questions_data]
    quiz = Quiz(student_id=req.student_id, topic=req.topic, subject=req.subject, grade=grade, questions=questions, assigned_by=teacher['id'])
    doc = quiz.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.quizzes.insert_one(doc)
    return {"quiz_id": quiz.id, "topic": req.topic, "questions_count": len(questions)}

@api_router.get("/teacher/class-analytics")
async def get_class_analytics(teacher=Depends(get_current_teacher)):
    students = await db.students.find({"grade": teacher['grade']}, {"_id": 0, "password": 0}).to_list(200)
    total = len(students)
    all_mastery = []
    for s in students:
        records = await db.mastery.find({"student_id": s['id']}, {"_id": 0}).to_list(100)
        for r in records:
            concept = await db.concepts.find_one({"id": r['concept_id']}, {"_id": 0})
            if concept:
                all_mastery.append({"student_name": s['name'], "concept": concept['name'], "mastery": r['mastery_level'], "subject": concept['subject']})
    # Aggregate by topic
    topic_avg = {}
    for m in all_mastery:
        key = m['concept']
        if key not in topic_avg:
            topic_avg[key] = {"total": 0, "count": 0, "subject": m['subject']}
        topic_avg[key]['total'] += m['mastery']
        topic_avg[key]['count'] += 1
    topic_summary = [{"topic": k, "avg_mastery": round(v['total']/v['count']*100, 1), "subject": v['subject'], "student_count": v['count']} for k, v in topic_avg.items()]
    topic_summary.sort(key=lambda x: x['avg_mastery'])
    return {"total_students": total, "topic_summary": topic_summary, "weak_topics": topic_summary[:5], "strong_topics": topic_summary[-5:][::-1] if len(topic_summary) >= 5 else []}

# ─── Profile & Settings ───
@api_router.get("/profile")
async def get_profile(current_student: Student = Depends(get_current_student)):
    badges = await db.badges.find({"student_id": current_student.id}, {"_id": 0}).to_list(100)
    streak = await db.streaks.find_one({"student_id": current_student.id}, {"_id": 0})
    quiz_count = await db.quiz_results.count_documents({"student_id": current_student.id})
    mastery_records = await db.mastery.find({"student_id": current_student.id}, {"_id": 0}).to_list(100)
    avg_mastery = sum(m['mastery_level'] for m in mastery_records) / len(mastery_records) if mastery_records else 0
    level = 1 + quiz_count // 3
    return {
        "id": current_student.id, "name": current_student.name, "email": current_student.email,
        "grade": current_student.grade, "language": current_student.language,
        "daily_goal_minutes": current_student.daily_goal_minutes,
        "difficulty_level": current_student.difficulty_level,
        "quiz_question_count": current_student.quiz_question_count,
        "level": level, "badges_earned": len(badges),
        "streak": streak.get("current_streak", 0) if streak else 0,
        "avg_mastery": round(avg_mastery * 100, 1), "total_quizzes": quiz_count
    }

@api_router.put("/profile")
async def update_profile(update: ProfileUpdate, current_student: Student = Depends(get_current_student)):
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.students.update_one({"id": current_student.id}, {"$set": update_dict})
    return {"updated": list(update_dict.keys())}

@api_router.get("/settings")
async def get_settings(current_student: Student = Depends(get_current_student)):
    return {
        "language": current_student.language,
        "daily_goal_minutes": current_student.daily_goal_minutes,
        "difficulty_level": current_student.difficulty_level,
        "quiz_question_count": current_student.quiz_question_count,
        "available_languages": LANGUAGES
    }

@api_router.put("/settings")
async def update_settings(update: ProfileUpdate, current_student: Student = Depends(get_current_student)):
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.students.update_one({"id": current_student.id}, {"$set": update_dict})
    return {"updated": list(update_dict.keys())}

# ─── Chat Sessions ───
@api_router.post("/chat/sessions")
async def create_chat_session(current_student: Student = Depends(get_current_student)):
    session_id = str(uuid.uuid4())
    doc = {"id": session_id, "student_id": current_student.id, "title": "New Chat",
           "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()}
    await db.chat_sessions.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.get("/chat/sessions")
async def get_chat_sessions(current_student: Student = Depends(get_current_student)):
    sessions = await db.chat_sessions.find(
        {"student_id": current_student.id}, {"_id": 0}
    ).sort("updated_at", -1).to_list(50)
    return sessions

@api_router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str, current_student: Student = Depends(get_current_student)):
    await db.chat_sessions.delete_one({"id": session_id, "student_id": current_student.id})
    await db.chat_messages.delete_many({"student_id": current_student.id, "session_id": session_id})
    return {"deleted": True}

@api_router.get("/chat/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, current_student: Student = Depends(get_current_student)):
    messages = await db.chat_messages.find(
        {"student_id": current_student.id, "session_id": session_id}, {"_id": 0}
    ).sort("timestamp", 1).limit(100).to_list(100)
    return messages

# ─── Chat ───
@api_router.post("/chat")
async def chat(request: ChatRequest, current_student: Student = Depends(get_current_student)):
    try:
        if not retriever.loaded:
            await retriever.load_data()
        grade = request.grade or current_student.grade
        lang = request.language or current_student.language or "english"
        difficulty = current_student.difficulty_level or "medium"
        session_id = request.session_id

        # Auto-create session if none
        if not session_id:
            session_id = str(uuid.uuid4())
            session_doc = {
                "id": session_id, "student_id": current_student.id, "title": "New Chat",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.chat_sessions.insert_one(session_doc)

        context_passages = retriever.retrieve(request.message, grade=grade, top_k=5)
        context_text = "\n\n".join([f"[{p['subject']} - {p['chapter']}]: {p['text']}" for p in context_passages[:3]])
        conversation_history = await _build_session_history(current_student.id, session_id, limit=10)
        system_prompt = _build_system_prompt(grade, context_text, lang, difficulty)

        openai_messages = [{"role": "system", "content": system_prompt}]
        openai_messages.extend(conversation_history)
        openai_messages.append({"role": "user", "content": request.message})
        ai_response = _call_openai(openai_messages)

        for msg in [
            {"student_id": current_student.id, "session_id": session_id, "role": "user", "content": request.message},
            {"student_id": current_student.id, "session_id": session_id, "role": "assistant", "content": ai_response}
        ]:
            doc = {**msg, "id": str(uuid.uuid4()), "timestamp": datetime.now(timezone.utc).isoformat()}
            await db.chat_messages.insert_one(doc)

        # Auto-generate session title from first message
        session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
        if session and session.get("title") == "New Chat":
            title = request.message[:50] + ("..." if len(request.message) > 50 else "")
            await db.chat_sessions.update_one({"id": session_id}, {"$set": {"title": title, "updated_at": datetime.now(timezone.utc).isoformat()}})
        else:
            await db.chat_sessions.update_one({"id": session_id}, {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})

        await _record_streak(current_student.id)
        return {"response": ai_response, "sources": context_passages[:3], "session_id": session_id}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/chat/action")
async def chat_action(request: ChatActionRequest, current_student: Student = Depends(get_current_student)):
    try:
        grade = current_student.grade
        session_id = request.session_id or ""
        await db.interactions.insert_one({
            "student_id": current_student.id, "action": request.action,
            "response_time_ms": request.response_time_ms, "timestamp": datetime.now(timezone.utc).isoformat()
        })

        if request.action == "simplify":
            ai_response = _call_openai(
        [
            {
                "role": "user",
                "content": f"""
        You are an excellent AI Tutor for NCERT students.

            Rewrite the following explanation in a much simpler, clearer, and more student-friendly way for {grade.replace('_', ' ')} students.

            RULES:
            - Make it easier to understand
            - Use simple words
            - Use short sentences
            - Use relatable real-life examples
            - Use emojis only where helpful
            - Use bullet points where useful
            - Use small sections with proper spacing
            - Focus on conceptual understanding first
            - Avoid textbook-style boring explanations
            - No LaTeX
            - Use normal math notation like F = m x a
            - Make the student feel: “Ohhh, now I get it!”

            End naturally with exactly 2 helpful follow-up suggestions starting with:
            - Want me to explain this with...
            - Want me to show...

            CONTENT TO SIMPLIFY:

        {request.last_ai_message}
"""
            }
        ]
    )

        elif request.action == "elaborate":
            ai_response = _call_openai(
                [
                    {
                        "role": "user",
                        "content": f"""
        You are an expert AI Tutor for NCERT students.

        Expand the following explanation with deeper understanding for {grade.replace('_', ' ')} students.

        RULES:
        - Add more conceptual depth
        - Include real-life applications
        - Add practical examples
        - Explain why the concept matters
        - Use comparison tables if useful
        - Use flowcharts if helpful
        - Use headings and clean formatting
        - Use proper spacing for readability
        - Make the explanation feel premium like ChatGPT
        - Avoid boring textbook writing
        - No LaTeX
        - Use simple readable math notation like F = m x a
        - Focus on helping the student truly understand, not memorize

        Add:
        - One “Exam Shortcut” section
        - One “Common Mistake Students Make” section
        - One “Quick Revision Trick” section

        End naturally with 2 engaging follow-up suggestions starting with:
        - If you're curious...
        - Want a quick quiz on...

        CONTENT TO ELABORATE:

        {request.last_ai_message}
        """
                    }
                ],
                max_tokens=900
            )
        elif request.action == "quiz":
            return await _generate_quiz_from_chat(current_student, request.last_ai_message)
        else:
            raise HTTPException(status_code=400, detail="Invalid action")

        for msg in [
            {"student_id": current_student.id, "session_id": session_id, "role": "user", "content": f"[{request.action.capitalize()}]"},
            {"student_id": current_student.id, "session_id": session_id, "role": "assistant", "content": ai_response}
        ]:
            doc = {**msg, "id": str(uuid.uuid4()), "timestamp": datetime.now(timezone.utc).isoformat()}
            await db.chat_messages.insert_one(doc)

        if request.action == "simplify":
            await _update_behavior_mastery(current_student.id, -0.05)
        elif request.action == "elaborate":
            await _update_behavior_mastery(current_student.id, 0.03)
        return {"response": ai_response, "action": request.action}
    except Exception as e:
        logger.error(f"Chat action error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _generate_quiz_from_chat(student, last_ai_message):
    grade = student.grade
    content = _call_openai([{"role": "user", "content": f"Generate 5 MCQ from this explanation for {grade.replace('_',' ')} in JSON: [{{'question':'?','options':['A','B','C','D'],'correct_answer':0,'topic':'Topic'}}]\n\n{last_ai_message}"}], temperature=0.8, max_tokens=1200)
    s, e = content.find('['), content.rfind(']') + 1
    questions = [QuizQuestion(**q) for q in json.loads(content[s:e] if s != -1 and e > s else content)]
    quiz = Quiz(student_id=student.id, topic=questions[0].topic if questions else "General", subject="General", grade=grade, questions=questions)
    doc = quiz.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.quizzes.insert_one(doc)
    return {"response": "", "action": "quiz", "quiz": quiz.model_dump()}

# ─── Guest ───
@api_router.post("/guest/chat")
async def guest_chat(request: GuestChatRequest):
    try:
        if not retriever.loaded:
            await retriever.load_data()
        context = retriever.retrieve(request.message, grade=request.grade, top_k=5)
        context_text = "\n\n".join([f"[{p['subject']} - {p['chapter']}]: {p['text']}" for p in context[:3]])
        history = await db.guest_messages.find({"session_id": request.session_id}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
        history.reverse()
        msgs = [{"role": "system", "content": _build_system_prompt(request.grade, context_text, request.language or "english")}]
        msgs.extend([{"role": m["role"], "content": m["content"]} for m in history])
        msgs.append({"role": "user", "content": request.message})
        ai_response = _call_openai(msgs)
        for d in [{"session_id": request.session_id, "role": "user", "content": request.message}, {"session_id": request.session_id, "role": "assistant", "content": ai_response}]:
            await db.guest_messages.insert_one({**d, "id": str(uuid.uuid4()), "timestamp": datetime.now(timezone.utc).isoformat()})
        return {"response": ai_response, "sources": context[:3]}
    except Exception as e:
        logger.error(f"Guest chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/guest/quiz/generate")
async def guest_generate_quiz(request: GuestQuizRequest):
    try:
        if not retriever.loaded:
            await retriever.load_data()
        context = retriever.retrieve(request.topic, grade=request.grade, top_k=5)
        content = _call_openai([{"role": "user", "content": f"Generate {request.num_questions} MCQ for {request.grade.replace('_',' ')} on {request.topic} ({request.subject}).\nContent: {chr(10).join([p['text'] for p in context[:3]])}\nJSON: [{{'question':'?','options':['A','B','C','D'],'correct_answer':0,'topic':'{request.topic}'}}]"}], temperature=0.8, max_tokens=1200)
        s, e = content.find('['), content.rfind(']') + 1
        questions = [QuizQuestion(**q) for q in json.loads(content[s:e] if s != -1 and e > s else content)]
        return {"id": str(uuid.uuid4()), "topic": request.topic, "subject": request.subject, "grade": request.grade, "questions": [q.model_dump() for q in questions]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Other existing endpoints ───
@api_router.get("/chat/history")
async def get_chat_history(current_student: Student = Depends(get_current_student)):
    return await db.chat_messages.find({"student_id": current_student.id}, {"_id": 0}).sort("timestamp", 1).limit(50).to_list(50)

@api_router.delete("/chat/history")
async def clear_chat_history(current_student: Student = Depends(get_current_student)):
    r = await db.chat_messages.delete_many({"student_id": current_student.id})
    await db.chat_sessions.delete_many({"student_id": current_student.id})
    return {"deleted": r.deleted_count}

@api_router.get("/subjects/{grade}")
async def get_subjects_for_grade(grade: str):
    return {"grade": grade, "subjects": GRADE_SUBJECTS.get(grade, [])}

@api_router.post("/quiz/generate")
async def generate_quiz(topic: str, subject: str, grade: Optional[str] = None, num_questions: int = 5, current_student: Student = Depends(get_current_student)):
    try:
        if not retriever.loaded:
            await retriever.load_data()
        grade = grade or current_student.grade
        num_questions = current_student.quiz_question_count or num_questions
        context = retriever.retrieve(topic, grade=grade, top_k=5)
        content = _call_openai([{"role": "user", "content": f"Generate {num_questions} MCQ for {grade.replace('_',' ')} on {topic} ({subject}).\nContent: {chr(10).join([p['text'] for p in context[:3]])}\nJSON: [{{'question':'?','options':['A','B','C','D'],'correct_answer':0,'topic':'{topic}'}}]\nMake progressively harder."}], temperature=0.8, max_tokens=1200)
        s, e = content.find('['), content.rfind(']') + 1
        questions = [QuizQuestion(**q) for q in json.loads(content[s:e] if s != -1 and e > s else content)]
        quiz = Quiz(student_id=current_student.id, topic=topic, subject=subject, grade=grade, questions=questions)
        doc = quiz.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.quizzes.insert_one(doc)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/quiz/assigned")
async def get_assigned_quizzes(current_student: Student = Depends(get_current_student)):
    quizzes = await db.quizzes.find({"student_id": current_student.id, "assigned_by": {"$ne": None}}, {"_id": 0}).sort("created_at", -1).to_list(20)
    # Check which are completed
    results = []
    for q in quizzes:
        result = await db.quiz_results.find_one({"quiz_id": q['id']}, {"_id": 0})
        results.append({**q, "completed": result is not None, "score": result.get('score') if result else None})
    return results

@api_router.post("/quiz/submit")
async def submit_quiz(submission: QuizSubmission, current_student: Student = Depends(get_current_student)):
    quiz_data = await db.quizzes.find_one({"id": submission.quiz_id}, {"_id": 0})
    if not quiz_data:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz_data['student_id'] != current_student.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    questions = [QuizQuestion(**q) for q in quiz_data['questions']]
    correct = sum(1 for i, a in enumerate(submission.answers) if i < len(questions) and a == questions[i].correct_answer)
    total = len(questions)
    score = (correct / total) * 100 if total > 0 else 0
    time_factor = 0.0
    if submission.response_times_ms and len(submission.response_times_ms) > 0:
        avg_time = sum(submission.response_times_ms) / len(submission.response_times_ms)
        if avg_time < 10000: time_factor = 0.05
        elif avg_time > 30000: time_factor = -0.05
        if avg_time < 10000 and correct == total:
            if not await db.badges.find_one({"student_id": current_student.id, "badge_id": "speed_demon"}, {"_id": 0}):
                await db.badges.insert_one({"student_id": current_student.id, "badge_id": "speed_demon", "earned_at": datetime.now(timezone.utc).isoformat()})
    result = QuizResult(student_id=current_student.id, quiz_id=submission.quiz_id, score=score, total_questions=total, correct_answers=correct, topic=quiz_data['topic'])
    doc = result.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.quiz_results.insert_one(doc)
    concept = await db.concepts.find_one({"name": quiz_data['topic'], "grade": quiz_data['grade']}, {"_id": 0})
    if not concept:
        new_concept = Concept(name=quiz_data['topic'], subject=quiz_data['subject'], grade=quiz_data['grade'])
        await db.concepts.insert_one(new_concept.model_dump())
        concept_id = new_concept.id
    else:
        concept_id = concept['id']
    mastery = await db.mastery.find_one({"student_id": current_student.id, "concept_id": concept_id}, {"_id": 0})
    if mastery:
        p = mastery['mastery_level']
        ratio = correct / total if total > 0 else 0
        new_m = (p * (0.3 + 0.5 * ratio)) / (p * (0.3 + 0.5 * ratio) + (1 - p) * (0.75 - 0.5 * ratio)) if correct < total else (p * 0.8) / (p * 0.8 + (1 - p) * 0.25)
        new_m = min(max(new_m + time_factor, 0.0), 1.0)
        await db.mastery.update_one({"student_id": current_student.id, "concept_id": concept_id}, {"$set": {"mastery_level": new_m, "attempts": mastery['attempts'] + 1, "correct_attempts": mastery['correct_attempts'] + correct, "last_updated": datetime.now(timezone.utc).isoformat()}})
    else:
        init = min(max(0.5 + (score / 100) * 0.3 + time_factor, 0.0), 1.0)
        doc = MasteryRecord(student_id=current_student.id, concept_id=concept_id, mastery_level=init, attempts=1, correct_attempts=correct).model_dump()
        doc['last_updated'] = doc['last_updated'].isoformat()
        await db.mastery.insert_one(doc)
    await _record_streak(current_student.id)
    new_badges = await _check_and_award_badges(current_student.id)
    return {**result.model_dump(), "new_badges": new_badges}

# ─── Progress ───
@api_router.get("/progress/mastery")
async def get_mastery(current_student: Student = Depends(get_current_student)):
    records = await db.mastery.find({"student_id": current_student.id}, {"_id": 0}).to_list(100)
    enriched = []
    for r in records:
        c = await db.concepts.find_one({"id": r['concept_id']}, {"_id": 0})
        if c: enriched.append({**r, "concept_name": c['name'], "subject": c['subject'], "grade": c['grade']})
    return enriched

@api_router.get("/progress/analytics")
async def get_analytics(current_student: Student = Depends(get_current_student)):
    results = await db.quiz_results.find({"student_id": current_student.id}, {"_id": 0}).sort("timestamp", -1).limit(20).to_list(20)
    total = len(results)
    avg = sum(r['score'] for r in results) / total if total > 0 else 0
    mastery = await db.mastery.find({"student_id": current_student.id}, {"_id": 0}).to_list(100)
    avg_m = sum(m['mastery_level'] for m in mastery) / len(mastery) if mastery else 0
    return {"total_quizzes": total, "average_score": round(avg, 2), "average_mastery": round(avg_m * 100, 2), "recent_results": results, "mastery_by_topic": mastery}

@api_router.get("/progress/recommendations")
async def get_recommendations(current_student: Student = Depends(get_current_student)):
    records = await db.mastery.find({"student_id": current_student.id}, {"_id": 0}).to_list(100)
    enriched = []
    for r in records:
        c = await db.concepts.find_one({"id": r['concept_id']}, {"_id": 0})
        if c: enriched.append({**r, "concept_name": c['name'], "subject": c['subject'], "grade": c['grade']})
    strong = sorted([m for m in enriched if m['mastery_level'] >= 0.7], key=lambda x: -x['mastery_level'])[:5]
    weak = sorted([m for m in enriched if m['mastery_level'] < 0.6], key=lambda x: x['mastery_level'])[:5]
    ai_rec = ""
    if enriched:
        try:
            ai_rec = _call_openai([{"role": "user", "content": f"Brief study advice (3-4 sentences) for {current_student.grade.replace('_',' ')} student.\nStrong: {', '.join([m['concept_name'] for m in strong[:3]]) or 'None yet'}\nWeak: {', '.join([m['concept_name'] for m in weak[:3]]) or 'None yet'}"}], max_tokens=200)
        except Exception: pass
    return {"strong_topics": strong, "weak_topics": weak, "focus_topics": sorted([m for m in enriched if 0.4 <= m['mastery_level'] < 0.7], key=lambda x: x['mastery_level'])[:5], "ai_recommendation": ai_rec}

@api_router.get("/progress/streak")
async def get_streak(current_student: Student = Depends(get_current_student)):
    s = await db.streaks.find_one({"student_id": current_student.id}, {"_id": 0})
    return s or {"current_streak": 0, "longest_streak": 0, "active_dates": []}

@api_router.get("/progress/badges")
async def get_badges(current_student: Student = Depends(get_current_student)):
    earned = await db.badges.find({"student_id": current_student.id}, {"_id": 0}).to_list(100)
    earned_ids = {b["badge_id"] for b in earned}
    return [{**bd, "earned": bd["id"] in earned_ids, "earned_at": next((b["earned_at"] for b in earned if b["badge_id"] == bd["id"]), None)} for bd in BADGE_DEFINITIONS]

@api_router.get("/progress/subjects")
async def get_subject_progress(current_student: Student = Depends(get_current_student)):

    # ✅ Default subjects per grade
    SUBJECTS_BY_GRADE = {
        "Grade 6": ["Mathematics", "Science", "English", "Social Science", "Hindi"],
        "Grade 7": ["Mathematics", "Science", "English", "Social Science", "Hindi"],
        "Grade 8": ["Mathematics", "Science", "English", "Social Science", "Hindi"],
        "Grade 9": ["Mathematics", "Science", "English", "Social Science", "Hindi"],
        "Grade 10": ["Mathematics", "Science", "English", "Social Science", "Hindi"],
        "Grade 11": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science"],
        "Grade 12": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science"],
    }

    subjects = SUBJECTS_BY_GRADE.get(current_student.grade, [])

    mastery = await db.mastery.find(
        {"student_id": current_student.id},
        {"_id": 0}
    ).to_list(1000)

    subject_map = {s: [] for s in subjects}

    for m in mastery:
        concept = await db.concepts.find_one({"id": m["concept_id"]})
        if concept and concept["subject"] in subject_map:
            subject_map[concept["subject"]].append(m["mastery_level"])

    result = []

    for subject in subjects:
        values = subject_map.get(subject, [])
        avg = sum(values) / len(values) if values else 0

        result.append({
            "subject": subject,
            "progress": round(avg * 100, 2)
        })

    return result
# ─── Helpers ───
async def _record_streak(student_id):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.streaks.find_one({"student_id": student_id}, {"_id": 0})
    if not doc:
        await db.streaks.insert_one({"student_id": student_id, "current_streak": 1, "longest_streak": 1, "last_active_date": today, "active_dates": [today]})
        return
    if doc.get("last_active_date") == today: return
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    new_streak = doc.get("current_streak", 0) + 1 if doc.get("last_active_date") == yesterday else 1
    dates = doc.get("active_dates", []) + [today]
    await db.streaks.update_one({"student_id": student_id}, {"$set": {"current_streak": new_streak, "longest_streak": max(doc.get("longest_streak", 0), new_streak), "last_active_date": today, "active_dates": dates[-30:]}})

async def _check_and_award_badges(student_id):
    earned = {b["badge_id"] for b in await db.badges.find({"student_id": student_id}, {"_id": 0}).to_list(100)}
    new = []
    qc = await db.quiz_results.count_documents({"student_id": student_id})
    if qc >= 1 and "first_quiz" not in earned: new.append("first_quiz")
    if qc >= 5 and "quiz_5" not in earned: new.append("quiz_5")
    if await db.quiz_results.find_one({"student_id": student_id, "score": 100.0}, {"_id": 0}) and "perfect_score" not in earned: new.append("perfect_score")
    s = await db.streaks.find_one({"student_id": student_id}, {"_id": 0})
    if s:
        if s.get("current_streak", 0) >= 3 and "streak_3" not in earned: new.append("streak_3")
        if s.get("current_streak", 0) >= 7 and "streak_7" not in earned: new.append("streak_7")
    if any(m.get("mastery_level", 0) >= 0.8 for m in await db.mastery.find({"student_id": student_id}, {"_id": 0}).to_list(100)) and "topic_master" not in earned: new.append("topic_master")
    if await db.chat_messages.count_documents({"student_id": student_id, "role": "user"}) >= 10 and "chat_explorer" not in earned: new.append("chat_explorer")
    for bid in new:
        await db.badges.insert_one({"student_id": student_id, "badge_id": bid, "earned_at": datetime.now(timezone.utc).isoformat()})
    return new

async def _update_behavior_mastery(student_id, delta):
    for r in await db.mastery.find({"student_id": student_id}, {"_id": 0}).to_list(100):
        await db.mastery.update_one({"student_id": student_id, "concept_id": r['concept_id']}, {"$set": {"mastery_level": min(max(r['mastery_level'] + delta, 0.0), 1.0), "last_updated": datetime.now(timezone.utc).isoformat()}})

# ─── File Upload (OCR / PDF) ───
def _extract_text_from_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages[:10]:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)[:5000]

def _extract_text_from_image_via_vision(image_bytes: bytes, mime_type: str) -> str:
    b64 = base64.b64encode(image_bytes).decode('utf-8')
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
        json={
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": [
                {"type": "text", "text": "Extract ALL text from this image. If it contains diagrams, describe them. If it's a textbook page, extract the full content including headings, paragraphs, and any formulas. Return the extracted text only."},
                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}}
            ]}],
            "max_tokens": 2000
        }
    )
    if response.status_code != 200:
        logger.error(f"Vision API error: {response.status_code}")
        raise HTTPException(status_code=500, detail="Failed to process image")
    return response.json()['choices'][0]['message']['content']

@api_router.post("/chat/upload")
async def chat_with_upload(
    file: UploadFile = File(...),
    message: str = Form(default=""),
    session_id: str = Form(default=""),
    language: str = Form(default="english"),
    current_student: Student = Depends(get_current_student)
):
    try:
        file_bytes = await file.read()
        filename = file.filename.lower()

        if filename.endswith('.pdf'):
            extracted_text = _extract_text_from_pdf(file_bytes)
            file_type = "pdf"
        elif any(filename.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp', '.heic']):
            mime = file.content_type or "image/png"
            extracted_text = _extract_text_from_image_via_vision(file_bytes, mime)
            file_type = "image"
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Upload PDF or image (PNG, JPG, WEBP).")

        if not retriever.loaded:
            await retriever.load_data()

        grade = current_student.grade
        lang = language or current_student.language or "english"
        difficulty = current_student.difficulty_level or "medium"

        if not session_id:
            session_id = str(uuid.uuid4())
            session_doc = {
                "id": session_id, "student_id": current_student.id, "title": "New Chat",
                "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.chat_sessions.insert_one(session_doc)

        user_msg = message.strip() if message.strip() else f"I uploaded a {file_type}. Please explain this content."
        context_passages = retriever.retrieve(extracted_text[:200], grade=grade, top_k=3)
        context_text = "\n\n".join([f"[{p['subject']} - {p['chapter']}]: {p['text']}" for p in context_passages[:2]])

        system_prompt = _build_system_prompt(grade, context_text, lang, difficulty)
        conversation_history = await _build_session_history(current_student.id, session_id, limit=6)

        openai_messages = [{"role": "system", "content": system_prompt}]
        openai_messages.extend(conversation_history)
        openai_messages.append({"role": "user", "content": f"{user_msg}\n\n--- Uploaded {file_type} content ---\n{extracted_text}"})
        ai_response = _call_openai(openai_messages, max_tokens=1000)

        display_msg = f"[Uploaded {file_type}: {file.filename}] {user_msg}"
        for msg in [
            {"student_id": current_student.id, "session_id": session_id, "role": "user", "content": display_msg},
            {"student_id": current_student.id, "session_id": session_id, "role": "assistant", "content": ai_response}
        ]:
            doc = {**msg, "id": str(uuid.uuid4()), "timestamp": datetime.now(timezone.utc).isoformat()}
            await db.chat_messages.insert_one(doc)

        session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
        if session and session.get("title") == "New Chat":
            title = f"{file_type.upper()}: {file.filename[:40]}"
            await db.chat_sessions.update_one({"id": session_id}, {"$set": {"title": title, "updated_at": datetime.now(timezone.utc).isoformat()}})

        return {"response": ai_response, "session_id": session_id, "extracted_text": extracted_text[:500], "file_type": file_type}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── Video Lecture Generation ───
def generate_structured_slides(topic, grade):
    prompt = f"""
    Create a structured lecture on {topic} for {grade} students.

    Return JSON:
    [
      {{
        "title": "Heading",
        "content": "2-3 sentence explanation",
        "visual": "diagram description"
      }}
    ]
    """

    res = _call_openai([{"role": "user", "content": prompt}])
    s, e = res.find('['), res.rfind(']') + 1
    return json.loads(res[s:e])

def generate_diagram(prompt, path):
    try:
        if not prompt or len(prompt.strip()) < 5:
            prompt = "simple educational diagram for students"

        full_prompt = f"""
        Create a clean educational diagram.
        Topic: {prompt}

        Style:
        - minimal
        - labeled
        - white background
        - clear arrows
        """

        result = client_ai.images.generate(
            model="gpt-image-1",
            prompt=full_prompt,
            size="512x512"
        )

        import base64
        img_data = base64.b64decode(result.data[0].b64_json)

        with open(path, "wb") as f:
            f.write(img_data)

    except Exception as e:
        print("IMAGE ERROR:", e)

        # 🔥 fallback image (VERY IMPORTANT)
        from PIL import Image

        fallback = Image.new("RGB", (512, 512), "white")
        fallback.save(path)

def create_slide(slide, diagram_path, output_path):
    base = Image.new("RGB", (1280, 720), "#0f172a")

    diagram = Image.open(diagram_path).resize((500, 500))
    base.paste(diagram, (700, 100))

    draw = ImageDraw.Draw(base)

    draw.text((50, 80), slide["title"], fill="white")
    draw.text((50, 200), slide["content"][:300], fill="#cbd5f5")

    base.save(output_path)

async def generate_audio(text, path):
    tts = edge_tts.Communicate(text, voice="en-US-AriaNeural")
    await tts.save(path)

def create_video(image_folder, audio_path, output_video):
    os.system(f"""
    ffmpeg -y -framerate 1/5 -i {image_folder}/slide_%d.png \
    -i {audio_path} \
    -c:v libx264 -pix_fmt yuv420p \
    -c:a aac -shortest {output_video}
    """)

async def generate_all_diagrams(slides, image_folder):
    tasks = []

    for i, slide in enumerate(slides):
        diagram_path = f"{image_folder}/diagram_{i}.png"

        # simple cache (optional but powerful)
        cache_path = f"cache/{slide['visual'].replace(' ', '_')}.png"
        os.makedirs("cache", exist_ok=True)

        if os.path.exists(cache_path):
            shutil.copy(cache_path, diagram_path)
        else:
            tasks.append(
                asyncio.to_thread(generate_diagram, slide["visual"], diagram_path)
            )

    if tasks:
        await asyncio.gather(*tasks)

        # save to cache
        for i, slide in enumerate(slides):
            diagram_path = f"{image_folder}/diagram_{i}.png"
            cache_path = f"cache/{slide['visual'].replace(' ', '_')}.png"
            if os.path.exists(diagram_path) and not os.path.exists(cache_path):
                shutil.copy(diagram_path, cache_path)


# ---------- MAIN PIPELINE ----------
async def generate_video_pipeline(topic, grade, video_id):
    try:
        # 1. Generate structured slides
        slides = generate_structured_slides(topic, grade)

        # 🚀 LIMIT slides (speed boost)
        slides = slides[:4]

        image_folder = str(VIDEO_DIR / video_id)
        os.makedirs(image_folder, exist_ok=True)

        # 2. Prepare narration
        full_text = " ".join([s["content"] for s in slides])
        audio_path = str(VIDEO_DIR / f"{video_id}.mp3")

        # 🚀 PARALLEL EXECUTION
        audio_task = asyncio.create_task(generate_audio(full_text, audio_path))
        diagram_task = asyncio.create_task(generate_all_diagrams(slides, image_folder))

        await asyncio.gather(audio_task, diagram_task)

        # 3. Create slides (after diagrams ready)
        for i, slide in enumerate(slides):
            diagram_path = f"{image_folder}/diagram_{i}.png"

            create_slide(
                slide,
                diagram_path,
                f"{image_folder}/slide_{i}.png"
            )

        # 4. Create video
        output_video = str(VIDEO_DIR / f"{video_id}.mp4")
        create_video(image_folder, audio_path, output_video)

        # 5. Save result
        await db.video_lectures.update_one(
            {"id": video_id},
            {"$set": {
                "status": "completed",
                "video_path": output_video,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )

    except Exception as e:
        await db.video_lectures.update_one(
            {"id": video_id},
            {"$set": {
                "status": "failed",
                "error": str(e)
            }}
        )



async def _generate_slideshow(topic: str, grade: str, video_id: str):
    try:
        slides_prompt = f"""Create a structured educational slideshow about "{topic}" for {grade.replace('_', ' ')} students.
Return JSON array of 5-6 slides: [{{"title": "Slide Title", "content": "Main explanation (2-3 sentences)", "key_points": ["point1", "point2"], "visual_description": "what diagram to show"}}]
Make it engaging, grade-appropriate, and educational."""
        slides_content = _call_openai([{"role": "user", "content": slides_prompt}], temperature=0.7, max_tokens=1200)
        s, e = slides_content.find('['), slides_content.rfind(']') + 1
        slides = json.loads(slides_content[s:e]) if s != -1 and e > s else []
        await db.video_lectures.update_one({"id": video_id}, {"$set": {"status": "completed", "slides": slides, "completed_at": datetime.now(timezone.utc).isoformat()}})
        logger.info(f"Slideshow {video_id} generated successfully")
    except Exception as e:
        logger.error(f"Slideshow generation error: {e}")
        await db.video_lectures.update_one({"id": video_id}, {"$set": {"status": "failed", "error": str(e)[:200]}})

@api_router.post("/video/generate")
async def generate_video_lecture(
    background_tasks: BackgroundTasks,
    topic: str = Form(...),
    video_type: str = Form(default="slideshow"),
    session_id: str = Form(default=""),
    current_student: Student = Depends(get_current_student)
):
    video_id = str(uuid.uuid4())
    grade = current_student.grade
    doc = {
        "id": video_id, "student_id": current_student.id, "topic": topic,
        "grade": grade, "video_type": video_type, "status": "generating",
        "session_id": session_id, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.video_lectures.insert_one(doc)

    if video_type == "sora2":
        background_tasks.add_task(generate_video_pipeline, topic, grade, video_id)
    else:
        background_tasks.add_task(_generate_slideshow, topic, grade, video_id)

    return {"video_id": video_id, "status": "generating", "video_type": video_type, "topic": topic}

@api_router.get("/video/{video_id}")
async def get_video_status(video_id: str, current_student: Student = Depends(get_current_student)):
    doc = await db.video_lectures.find_one({"id": video_id, "student_id": current_student.id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Video not found")
    return doc

@api_router.get("/video/{video_id}/download")
async def download_video(video_id: str):
    doc = await db.video_lectures.find_one(
        {"id": video_id},
        {"_id": 0}
    )

    if not doc or doc.get("status") != "completed" or not doc.get("video_path"):
        raise HTTPException(status_code=404, detail="Video not ready")

    return FileResponse(
        doc["video_path"],
        media_type="video/mp4",
        filename=f"{doc['topic']}_lecture.mp4"
    )

@api_router.get("/videos")
async def get_my_videos(current_student: Student = Depends(get_current_student)):
    videos = await db.video_lectures.find(
        {"student_id": current_student.id}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return videos

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    asyncio.create_task(retriever.load_data())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
