#!/usr/bin/env python3
"""
EduNiti New Features Testing Suite
Tests the new features added: guest endpoints, streak tracking, badges, recommendations, etc.
"""

import requests
import json
import sys
import time
from datetime import datetime

class EduNitiNewFeaturesTester:
    def __init__(self, base_url="https://fullstack-builder-102.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session_id = f"test_session_{int(time.time())}"
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            self.failed_tests.append({"name": name, "details": details})
            print(f"❌ {name} - {details}")
    
    def make_request(self, method: str, endpoint: str, data=None, params=None, auth_required=False):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, params=params, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            
            if response.status_code in [200, 201]:
                return True, response.json() if response.content else {}
            else:
                return False, {
                    "status_code": response.status_code,
                    "error": response.text[:200]
                }
        except Exception as e:
            return False, {"error": str(e)}
    
    def test_guest_chat_features(self):
        """Test guest chat with language toggle and session management"""
        print("\n🔍 Testing Guest Chat Features...")
        
        # Test English chat
        chat_data = {
            "message": "What is photosynthesis?",
            "grade": "Grade_10",
            "language": "english",
            "session_id": self.session_id
        }
        
        success, response = self.make_request('POST', '/guest/chat', data=chat_data)
        if success and 'response' in response:
            self.log_test("Guest chat - English", True)
            
            # Test Hindi language toggle
            chat_data["language"] = "hindi"
            chat_data["message"] = "प्रकाश संश्लेषण क्या है?"
            success, response = self.make_request('POST', '/guest/chat', data=chat_data)
            self.log_test("Guest chat - Hindi language toggle", success and 'response' in response)
            
            # Test session persistence (same session_id)
            chat_data["message"] = "Tell me more about it"
            success, response = self.make_request('POST', '/guest/chat', data=chat_data)
            self.log_test("Guest chat - Session persistence", success and 'response' in response)
        else:
            self.log_test("Guest chat - English", False, response.get('error', 'Unknown error'))
    
    def test_guest_quiz_grade_subjects(self):
        """Test guest quiz with grade-specific subjects"""
        print("\n🔍 Testing Guest Quiz with Grade-Specific Subjects...")
        
        # Test different grades
        test_cases = [
            {"grade": "Grade_6", "subject": "Science"},
            {"grade": "Grade_10", "subject": "Mathematics"},
            {"grade": "Grade_12", "subject": "Physics"}
        ]
        
        for case in test_cases:
            quiz_data = {
                "topic": "Basic Concepts",
                "subject": case["subject"],
                "grade": case["grade"],
                "num_questions": 3
            }
            
            success, response = self.make_request('POST', '/guest/quiz/generate', data=quiz_data)
            if success and 'questions' in response and response.get('grade') == case["grade"]:
                self.log_test(f"Guest quiz - {case['grade']} {case['subject']}", True)
            else:
                self.log_test(f"Guest quiz - {case['grade']} {case['subject']}", False, 
                             f"Grade mismatch or no questions: {response}")
    
    def authenticate(self):
        """Authenticate with demo account"""
        login_data = {
            "email": "demo@eduniti.com",
            "password": "demo123"
        }
        
        success, response = self.make_request('POST', '/auth/login', data=login_data)
        if success and 'token' in response:
            self.token = response['token']
            self.log_test("Authentication", True)
            return True
        else:
            self.log_test("Authentication", False, response.get('error', 'Unknown error'))
            return False
    
    def test_streak_tracking(self):
        """Test streak tracking functionality"""
        print("\n🔍 Testing Streak Tracking...")
        
        success, response = self.make_request('GET', '/progress/streak', auth_required=True)
        if success:
            required_fields = ['current_streak', 'longest_streak', 'active_dates']
            has_all_fields = all(field in response for field in required_fields)
            self.log_test("Streak data structure", has_all_fields)
            
            if has_all_fields:
                current_streak = response.get('current_streak', 0)
                self.log_test("Streak tracking active", isinstance(current_streak, int) and current_streak >= 0)
        else:
            self.log_test("Streak tracking", False, response.get('error', 'Unknown error'))
    
    def test_badge_system(self):
        """Test badge system with 8 badge definitions"""
        print("\n🔍 Testing Badge System...")
        
        success, response = self.make_request('GET', '/progress/badges', auth_required=True)
        if success and isinstance(response, list):
            # Check for 8 badges
            self.log_test("Badge count (8 badges)", len(response) == 8)
            
            if len(response) > 0:
                first_badge = response[0]
                required_fields = ['id', 'name', 'description', 'icon', 'color', 'earned']
                has_all_fields = all(field in first_badge for field in required_fields)
                self.log_test("Badge structure", has_all_fields)
                
                # Check for specific badges mentioned in the code
                badge_ids = [badge.get('id') for badge in response]
                expected_badges = ['first_quiz', 'perfect_score', 'streak_3', 'streak_7', 
                                 'topic_master', 'quiz_5', 'chat_explorer', 'speed_demon']
                has_expected_badges = all(badge_id in badge_ids for badge_id in expected_badges)
                self.log_test("Expected badge definitions", has_expected_badges)
        else:
            self.log_test("Badge system", False, response.get('error', 'Unknown error'))
    
    def test_ai_recommendations(self):
        """Test AI recommendations endpoint"""
        print("\n🔍 Testing AI Recommendations...")
        
        success, response = self.make_request('GET', '/progress/recommendations', auth_required=True)
        if success:
            required_fields = ['strong_topics', 'weak_topics', 'ai_recommendation']
            has_all_fields = all(field in response for field in required_fields)
            self.log_test("Recommendations structure", has_all_fields)
            
            # Check if AI recommendation is provided (might be empty for new users)
            ai_rec = response.get('ai_recommendation', '')
            self.log_test("AI recommendation field", 'ai_recommendation' in response)
        else:
            self.log_test("AI recommendations", False, response.get('error', 'Unknown error'))
    
    def test_chat_clear_history(self):
        """Test chat history clearing"""
        print("\n🔍 Testing Chat History Management...")
        
        # First, send a message to create history
        chat_data = {
            "message": "Test message for history",
            "language": "english"
        }
        
        success, response = self.make_request('POST', '/chat', data=chat_data, auth_required=True)
        if success:
            # Check history exists
            success, history = self.make_request('GET', '/chat/history', auth_required=True)
            if success and isinstance(history, list) and len(history) > 0:
                self.log_test("Chat history creation", True)
                
                # Clear history
                success, clear_response = self.make_request('DELETE', '/chat/history', auth_required=True)
                if success and 'deleted' in clear_response:
                    self.log_test("Chat history clearing", True)
                    
                    # Verify history is cleared
                    success, new_history = self.make_request('GET', '/chat/history', auth_required=True)
                    self.log_test("History cleared verification", 
                                success and isinstance(new_history, list) and len(new_history) == 0)
                else:
                    self.log_test("Chat history clearing", False, clear_response.get('error', 'Unknown error'))
            else:
                self.log_test("Chat history creation", False, "No history found")
        else:
            self.log_test("Chat message for history test", False, response.get('error', 'Unknown error'))
    
    def test_quiz_from_chat_redirect(self):
        """Test Ask Quiz button functionality and auto-redirect"""
        print("\n🔍 Testing Quiz from Chat (Ask Quiz button)...")
        
        # Send a chat message first
        chat_data = {
            "message": "Explain photosynthesis in plants",
            "language": "english"
        }
        
        success, response = self.make_request('POST', '/chat', data=chat_data, auth_required=True)
        if success and 'response' in response:
            ai_response = response['response']
            
            # Test quiz generation from chat
            action_data = {
                "action": "quiz",
                "last_ai_message": ai_response,
                "response_time_ms": 2000
            }
            
            success, quiz_response = self.make_request('POST', '/chat/action', data=action_data, auth_required=True)
            if success and 'quiz' in quiz_response:
                quiz = quiz_response['quiz']
                required_fields = ['id', 'questions', 'topic', 'subject', 'grade']
                has_all_fields = all(field in quiz for field in required_fields)
                self.log_test("Quiz from chat generation", has_all_fields)
                
                # Verify quiz has 5 questions (as mentioned in requirements)
                questions = quiz.get('questions', [])
                self.log_test("Quiz from chat - 5 questions", len(questions) == 5)
            else:
                self.log_test("Quiz from chat generation", False, quiz_response.get('error', 'Unknown error'))
        else:
            self.log_test("Chat message for quiz test", False, response.get('error', 'Unknown error'))
    
    def test_response_time_tracking(self):
        """Test quiz response time tracking and speed demon badge"""
        print("\n🔍 Testing Response Time Tracking...")
        
        # Generate a quiz
        params = {
            "topic": "Speed Test",
            "subject": "Mathematics",
            "num_questions": 3
        }
        
        success, response = self.make_request('POST', '/quiz/generate', params=params, auth_required=True)
        if success and 'id' in response:
            quiz_id = response['id']
            
            # Submit with fast response times (under 10s average for speed demon badge)
            submission_data = {
                "quiz_id": quiz_id,
                "answers": [0, 1, 2],  # All correct answers
                "response_times_ms": [5000, 7000, 8000]  # Fast response times
            }
            
            success, result = self.make_request('POST', '/quiz/submit', data=submission_data, auth_required=True)
            if success:
                self.log_test("Quiz submission with response times", True)
                
                # Check if response times are tracked
                new_badges = result.get('new_badges', [])
                self.log_test("Response time tracking", 'new_badges' in result)
            else:
                self.log_test("Quiz submission with response times", False, result.get('error', 'Unknown error'))
        else:
            self.log_test("Quiz generation for response time test", False, response.get('error', 'Unknown error'))
    
    def run_all_tests(self):
        """Run all new feature tests"""
        print("🚀 Starting EduNiti New Features Testing")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test guest features (no auth required)
        self.test_guest_chat_features()
        self.test_guest_quiz_grade_subjects()
        
        # Authenticate for protected features
        if self.authenticate():
            self.test_streak_tracking()
            self.test_badge_system()
            self.test_ai_recommendations()
            self.test_chat_clear_history()
            self.test_quiz_from_chat_redirect()
            self.test_response_time_tracking()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests ({len(self.failed_tests)}):")
            for test in self.failed_tests:
                print(f"  • {test['name']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = EduNitiNewFeaturesTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())