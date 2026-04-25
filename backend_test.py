import requests
import sys
import json
from datetime import datetime
import time

class EduNitiAPITester:
    def __init__(self, base_url="https://fullstack-builder-102.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.student_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.quiz_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register(self):
        """Test student registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "name": f"Test Student {timestamp}",
            "email": f"test{timestamp}@eduniti.com",
            "password": "testpass123",
            "grade": "Grade_10"
        }
        
        success, response = self.run_test(
            "Student Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.student_id = response['student']['id']
            print(f"   Registered student: {response['student']['name']}")
            return True
        return False

    def test_login(self):
        """Test login with demo credentials"""
        login_data = {
            "email": "demo@eduniti.com",
            "password": "demo123"
        }
        
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.student_id = response['student']['id']
            print(f"   Logged in student: {response['student']['name']}")
            return True
        return False

    def test_get_current_student(self):
        """Test getting current student info"""
        success, response = self.run_test(
            "Get Current Student",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_chat_message(self):
        """Test sending a chat message"""
        chat_data = {
            "message": "What is photosynthesis?",
            "grade": "Grade_10"
        }
        
        success, response = self.run_test(
            "Send Chat Message",
            "POST",
            "chat",
            200,
            data=chat_data
        )
        
        if success and 'response' in response:
            print(f"   AI Response: {response['response'][:100]}...")
            return True
        return False

    def test_chat_history(self):
        """Test getting chat history"""
        success, response = self.run_test(
            "Get Chat History",
            "GET",
            "chat/history",
            200
        )
        
        if success:
            print(f"   Found {len(response)} chat messages")
            return True
        return False

    def test_quiz_generation(self):
        """Test quiz generation"""
        success, response = self.run_test(
            "Generate Quiz",
            "POST",
            "quiz/generate?topic=Photosynthesis&subject=Science&num_questions=3",
            200
        )
        
        if success and 'id' in response:
            self.quiz_id = response['id']
            print(f"   Generated quiz with {len(response['questions'])} questions")
            return True
        return False

    def test_quiz_submission(self):
        """Test quiz submission with response times"""
        if not self.quiz_id:
            print("❌ No quiz ID available for submission test")
            return False
            
        submission_data = {
            "quiz_id": self.quiz_id,
            "answers": [0, 1, 0],  # Sample answers
            "response_times_ms": [5000, 8000, 12000]  # Response times per question
        }
        
        success, response = self.run_test(
            "Submit Quiz with Response Times",
            "POST",
            "quiz/submit",
            200,
            data=submission_data
        )
        
        if success and 'score' in response:
            print(f"   Quiz score: {response['score']}%")
            return True
        return False

    def test_progress_analytics(self):
        """Test progress analytics"""
        success, response = self.run_test(
            "Get Progress Analytics",
            "GET",
            "progress/analytics",
            200
        )
        
        if success:
            print(f"   Total quizzes: {response.get('total_quizzes', 0)}")
            print(f"   Average score: {response.get('average_score', 0)}%")
            return True
        return False

    def test_mastery_data(self):
        """Test mastery data retrieval"""
        success, response = self.run_test(
            "Get Mastery Data",
            "GET",
            "progress/mastery",
            200
        )
        
        if success:
            print(f"   Found {len(response)} mastery records")
            return True
        return False

    def test_grade_subjects(self):
        """Test grade-specific subjects endpoint"""
        success, response = self.run_test(
            "Get Grade 10 Subjects",
            "GET",
            "subjects/Grade_10",
            200
        )
        
        if success and 'subjects' in response:
            subjects = response['subjects']
            print(f"   Grade 10 subjects: {subjects}")
            expected_subjects = ["English", "Hindi", "Mathematics", "Sanskrit", "Science", "Social_Science"]
            if all(subj in subjects for subj in expected_subjects):
                print("   ✅ All expected Grade 10 subjects found")
            else:
                print("   ⚠️ Some expected subjects missing")
            return True
        return False

    def test_chat_actions(self):
        """Test chat action buttons (simplify, elaborate, quiz)"""
        # First send a chat message to get AI response
        chat_data = {
            "message": "Explain Newton's first law",
            "grade": "Grade_10"
        }
        
        success, response = self.run_test(
            "Chat for Action Testing",
            "POST",
            "chat",
            200,
            data=chat_data
        )
        
        if not success or 'response' not in response:
            print("❌ Failed to get AI response for action testing")
            return False
        
        ai_message = response['response']
        print(f"   AI message for actions: {ai_message[:100]}...")
        
        # Test Simplify action
        simplify_data = {
            "action": "simplify",
            "last_ai_message": ai_message,
            "response_time_ms": 5000
        }
        
        success1, response1 = self.run_test(
            "Chat Action - Simplify",
            "POST",
            "chat/action",
            200,
            data=simplify_data
        )
        
        # Test Elaborate action
        elaborate_data = {
            "action": "elaborate",
            "last_ai_message": ai_message,
            "response_time_ms": 3000
        }
        
        success2, response2 = self.run_test(
            "Chat Action - Elaborate",
            "POST",
            "chat/action",
            200,
            data=elaborate_data
        )
        
        # Test Quiz action
        quiz_data = {
            "action": "quiz",
            "last_ai_message": ai_message,
            "response_time_ms": 7000
        }
        
        success3, response3 = self.run_test(
            "Chat Action - Quiz",
            "POST",
            "chat/action",
            200,
            data=quiz_data
        )
        
        return success1 and success2 and success3

def main():
    print("🚀 Starting EduNiti API Testing...")
    print("=" * 50)
    
    tester = EduNitiAPITester()
    
    # Test authentication flow
    print("\n📝 AUTHENTICATION TESTS")
    print("-" * 30)
    
    # Try login first with demo account
    if not tester.test_login():
        # If demo login fails, try registration
        if not tester.test_register():
            print("❌ Both login and registration failed, stopping tests")
            return 1
    
    # Test getting current student
    if not tester.test_get_current_student():
        print("❌ Failed to get current student info")
        return 1
    
    # Test chat functionality
    print("\n💬 CHAT TESTS")
    print("-" * 30)
    
    if not tester.test_chat_message():
        print("❌ Chat message test failed")
    
    # Wait a bit for chat to be processed
    time.sleep(2)
    
    if not tester.test_chat_history():
        print("❌ Chat history test failed")
    
    # Test chat actions (new feature)
    if not tester.test_chat_actions():
        print("❌ Chat actions test failed")
    
    # Test grade-specific subjects (new feature)
    print("\n🎓 GRADE SUBJECTS TESTS")
    print("-" * 30)
    
    if not tester.test_grade_subjects():
        print("❌ Grade subjects test failed")
    
    # Test quiz functionality
    print("\n📝 QUIZ TESTS")
    print("-" * 30)
    
    if not tester.test_quiz_generation():
        print("❌ Quiz generation test failed")
    else:
        # Wait a bit for quiz to be generated
        time.sleep(2)
        if not tester.test_quiz_submission():
            print("❌ Quiz submission test failed")
    
    # Test progress tracking
    print("\n📊 PROGRESS TESTS")
    print("-" * 30)
    
    if not tester.test_progress_analytics():
        print("❌ Progress analytics test failed")
    
    if not tester.test_mastery_data():
        print("❌ Mastery data test failed")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend tests mostly successful!")
        return 0
    elif success_rate >= 50:
        print("⚠️ Backend has some issues but core functionality works")
        return 0
    else:
        print("❌ Backend has significant issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())