"""
Phase 3 Backend API Tests for EduNiti
Tests: Chat Sessions, Settings, Profile, Teacher Auth & Dashboard
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
STUDENT_EMAIL = "demo@eduniti.com"
STUDENT_PASSWORD = "demo123"
TEACHER_ACCESS_CODE = "EDUNITI-TEACHER-2026"

class TestStudentAuth:
    """Student authentication tests"""
    
    def test_student_login_success(self):
        """Test student login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "student" in data, "No student data in response"
        assert data["student"]["email"] == STUDENT_EMAIL
        print(f"SUCCESS: Student login - token received")
        return data["token"]
    
    def test_student_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Invalid credentials rejected")


class TestChatSessions:
    """Chat session management tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_chat_sessions(self, auth_token):
        """GET /api/chat/sessions - list sessions"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/chat/sessions", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of sessions"
        print(f"SUCCESS: GET /api/chat/sessions - {len(data)} sessions found")
    
    def test_create_chat_session(self, auth_token):
        """POST /api/chat/sessions - create new session"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/chat/sessions", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data, "No session id in response"
        assert "title" in data, "No title in response"
        assert data["title"] == "New Chat", f"Expected 'New Chat', got {data['title']}"
        print(f"SUCCESS: POST /api/chat/sessions - created session {data['id']}")
        return data["id"]
    
    def test_delete_chat_session(self, auth_token):
        """DELETE /api/chat/sessions/{id} - delete session"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # First create a session
        create_res = requests.post(f"{BASE_URL}/api/chat/sessions", headers=headers)
        session_id = create_res.json()["id"]
        
        # Then delete it
        response = requests.delete(f"{BASE_URL}/api/chat/sessions/{session_id}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("deleted") == True, "Delete not confirmed"
        print(f"SUCCESS: DELETE /api/chat/sessions/{session_id}")
    
    def test_get_session_messages(self, auth_token):
        """GET /api/chat/sessions/{id}/messages - get messages"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # Create a session first
        create_res = requests.post(f"{BASE_URL}/api/chat/sessions", headers=headers)
        session_id = create_res.json()["id"]
        
        response = requests.get(f"{BASE_URL}/api/chat/sessions/{session_id}/messages", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of messages"
        print(f"SUCCESS: GET /api/chat/sessions/{session_id}/messages")


class TestSettings:
    """Settings API tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_settings(self, auth_token):
        """GET /api/settings - get current settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/settings", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "language" in data, "No language in settings"
        assert "daily_goal_minutes" in data, "No daily_goal_minutes"
        assert "difficulty_level" in data, "No difficulty_level"
        assert "quiz_question_count" in data, "No quiz_question_count"
        assert "available_languages" in data, "No available_languages"
        print(f"SUCCESS: GET /api/settings - language={data['language']}, difficulty={data['difficulty_level']}")
    
    def test_update_settings(self, auth_token):
        """PUT /api/settings - update settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        update_data = {
            "language": "hindi",
            "daily_goal_minutes": 45,
            "difficulty_level": "hard"
        }
        response = requests.put(f"{BASE_URL}/api/settings", headers=headers, json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "updated" in data, "No updated field in response"
        print(f"SUCCESS: PUT /api/settings - updated {data['updated']}")
        
        # Verify the update
        verify_res = requests.get(f"{BASE_URL}/api/settings", headers=headers)
        verify_data = verify_res.json()
        assert verify_data["language"] == "hindi", "Language not updated"
        assert verify_data["daily_goal_minutes"] == 45, "Daily goal not updated"
        print("SUCCESS: Settings update verified")
        
        # Reset to original
        requests.put(f"{BASE_URL}/api/settings", headers=headers, json={
            "language": "english",
            "daily_goal_minutes": 30,
            "difficulty_level": "medium"
        })


class TestProfile:
    """Profile API tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_profile(self, auth_token):
        """GET /api/profile - get profile data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/profile", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data, "No id in profile"
        assert "name" in data, "No name in profile"
        assert "email" in data, "No email in profile"
        assert "grade" in data, "No grade in profile"
        assert "level" in data, "No level in profile"
        assert "badges_earned" in data, "No badges_earned"
        assert "streak" in data, "No streak"
        assert "avg_mastery" in data, "No avg_mastery"
        assert "total_quizzes" in data, "No total_quizzes"
        print(f"SUCCESS: GET /api/profile - name={data['name']}, level={data['level']}, streak={data['streak']}")
    
    def test_update_profile_name(self, auth_token):
        """PUT /api/profile - update name"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get original name
        orig_res = requests.get(f"{BASE_URL}/api/profile", headers=headers)
        original_name = orig_res.json()["name"]
        
        # Update name
        new_name = f"TEST_User_{uuid.uuid4().hex[:6]}"
        response = requests.put(f"{BASE_URL}/api/profile", headers=headers, json={"name": new_name})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "updated" in data, "No updated field"
        assert "name" in data["updated"], "Name not in updated list"
        
        # Verify update
        verify_res = requests.get(f"{BASE_URL}/api/profile", headers=headers)
        assert verify_res.json()["name"] == new_name, "Name not updated"
        print(f"SUCCESS: PUT /api/profile - name updated to {new_name}")
        
        # Reset to original
        requests.put(f"{BASE_URL}/api/profile", headers=headers, json={"name": original_name})


class TestTeacherAuth:
    """Teacher authentication tests"""
    
    def test_teacher_register_invalid_code(self):
        """POST /api/auth/teacher/register - invalid access code"""
        response = requests.post(f"{BASE_URL}/api/auth/teacher/register", json={
            "name": "Test Teacher",
            "email": f"test_teacher_{uuid.uuid4().hex[:6]}@test.com",
            "password": "testpass123",
            "grade": "Grade_10",
            "subject": "Science",
            "access_code": "WRONG-CODE"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("SUCCESS: Invalid teacher access code rejected")
    
    def test_teacher_register_success(self):
        """POST /api/auth/teacher/register - valid registration"""
        unique_email = f"test_teacher_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/teacher/register", json={
            "name": "Test Teacher",
            "email": unique_email,
            "password": "testpass123",
            "grade": "Grade_10",
            "subject": "Science",
            "access_code": TEACHER_ACCESS_CODE
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "teacher" in data, "No teacher data in response"
        assert data["teacher"]["email"] == unique_email
        assert data["teacher"]["grade"] == "Grade_10"
        print(f"SUCCESS: Teacher registered - {unique_email}")
        return data["token"], unique_email
    
    def test_teacher_login_success(self):
        """POST /api/auth/teacher/login - login with registered teacher"""
        # First register a teacher
        unique_email = f"test_teacher_{uuid.uuid4().hex[:8]}@test.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/teacher/register", json={
            "name": "Login Test Teacher",
            "email": unique_email,
            "password": "testpass123",
            "grade": "Grade_10",
            "subject": "Science",
            "access_code": TEACHER_ACCESS_CODE
        })
        assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
        
        # Now login
        response = requests.post(f"{BASE_URL}/api/auth/teacher/login", json={
            "email": unique_email,
            "password": "testpass123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "teacher" in data, "No teacher data"
        print(f"SUCCESS: Teacher login - {unique_email}")
        return data["token"]
    
    def test_teacher_login_invalid_credentials(self):
        """POST /api/auth/teacher/login - invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/teacher/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Invalid teacher credentials rejected")


class TestTeacherDashboard:
    """Teacher dashboard API tests"""
    
    @pytest.fixture
    def teacher_token(self):
        """Create and login a teacher for Grade_10"""
        unique_email = f"test_teacher_{uuid.uuid4().hex[:8]}@test.com"
        reg_res = requests.post(f"{BASE_URL}/api/auth/teacher/register", json={
            "name": "Dashboard Test Teacher",
            "email": unique_email,
            "password": "testpass123",
            "grade": "Grade_10",
            "subject": "Science",
            "access_code": TEACHER_ACCESS_CODE
        })
        return reg_res.json()["token"]
    
    def test_get_teacher_students(self, teacher_token):
        """GET /api/teacher/students - list students in teacher's grade"""
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.get(f"{BASE_URL}/api/teacher/students", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of students"
        print(f"SUCCESS: GET /api/teacher/students - {len(data)} students found")
        
        # Check student data structure if any students exist
        if len(data) > 0:
            student = data[0]
            assert "id" in student, "No id in student"
            assert "name" in student, "No name in student"
            assert "email" in student, "No email in student"
            assert "quiz_count" in student, "No quiz_count"
            assert "avg_mastery" in student, "No avg_mastery"
            assert "streak" in student, "No streak"
            print(f"  First student: {student['name']} - mastery: {student['avg_mastery']}%")
        return data
    
    def test_get_class_analytics(self, teacher_token):
        """GET /api/teacher/class-analytics - class analytics"""
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.get(f"{BASE_URL}/api/teacher/class-analytics", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_students" in data, "No total_students"
        assert "topic_summary" in data, "No topic_summary"
        assert "weak_topics" in data, "No weak_topics"
        assert "strong_topics" in data, "No strong_topics"
        print(f"SUCCESS: GET /api/teacher/class-analytics - {data['total_students']} students")
    
    def test_get_student_detail(self, teacher_token):
        """GET /api/teacher/student/{id} - student detail"""
        headers = {"Authorization": f"Bearer {teacher_token}"}
        
        # First get list of students
        students_res = requests.get(f"{BASE_URL}/api/teacher/students", headers=headers)
        students = students_res.json()
        
        if len(students) == 0:
            pytest.skip("No students in Grade_10 to test")
        
        student_id = students[0]["id"]
        response = requests.get(f"{BASE_URL}/api/teacher/student/{student_id}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "student" in data, "No student in response"
        assert "mastery" in data, "No mastery in response"
        assert "quiz_results" in data, "No quiz_results"
        assert "streak" in data, "No streak"
        print(f"SUCCESS: GET /api/teacher/student/{student_id} - {data['student']['name']}")
    
    def test_get_student_detail_not_found(self, teacher_token):
        """GET /api/teacher/student/{id} - non-existent student"""
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.get(f"{BASE_URL}/api/teacher/student/nonexistent-id", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SUCCESS: Non-existent student returns 404")


class TestChatWithSession:
    """Chat API with session management"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        return response.json()["token"]
    
    def test_chat_auto_creates_session(self, auth_token):
        """POST /api/chat - auto-creates session if none provided"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/chat", headers=headers, json={
            "message": "What is photosynthesis?",
            "grade": "Grade_10",
            "language": "english"
        }, timeout=60)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "response" in data, "No response in chat"
        assert "session_id" in data, "No session_id returned"
        print(f"SUCCESS: POST /api/chat - auto-created session {data['session_id']}")
    
    def test_chat_with_existing_session(self, auth_token):
        """POST /api/chat - use existing session"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a session first
        session_res = requests.post(f"{BASE_URL}/api/chat/sessions", headers=headers)
        session_id = session_res.json()["id"]
        
        # Send message with session_id
        response = requests.post(f"{BASE_URL}/api/chat", headers=headers, json={
            "message": "Explain Newton's first law",
            "session_id": session_id,
            "grade": "Grade_10",
            "language": "english"
        }, timeout=60)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["session_id"] == session_id, "Session ID mismatch"
        print(f"SUCCESS: POST /api/chat with session {session_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
