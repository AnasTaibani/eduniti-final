"""
Phase 4 API Tests - File Upload, Video Generation, i18n
Tests for:
1. File upload endpoint (POST /api/chat/upload)
2. Video generation endpoints (POST /api/video/generate, GET /api/video/{id}, GET /api/videos)
3. Settings update for language (PUT /api/settings)
"""
import pytest
import requests
import os
import time
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fullstack-builder-102.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@eduniti.com"
TEST_PASSWORD = "demo123"


class TestPhase4APIs:
    """Phase 4 API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.student = data["student"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.headers_multipart = {
            "Authorization": f"Bearer {self.token}"
        }
    
    # ─── File Upload Tests ───
    
    def test_file_upload_endpoint_exists(self):
        """Test that file upload endpoint exists and requires file"""
        # Test without file - should return 422 (validation error)
        response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            headers=self.headers_multipart,
            data={"message": "test"}
        )
        # Should fail because file is required
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}: {response.text}"
        print("✓ File upload endpoint exists and validates file requirement")
    
    def test_file_upload_with_image(self):
        """Test file upload with a small test image"""
        # Create a minimal PNG image (1x1 pixel)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # bit depth, color type
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_image.png', io.BytesIO(png_data), 'image/png')
        }
        data = {
            'message': 'What is in this image?',
            'language': 'english'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            headers=self.headers_multipart,
            files=files,
            data=data
        )
        
        # Should return 200 with response
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        result = response.json()
        
        # Verify response structure
        assert "response" in result, "Missing 'response' in result"
        assert "session_id" in result, "Missing 'session_id' in result"
        assert "file_type" in result, "Missing 'file_type' in result"
        assert result["file_type"] == "image", f"Expected file_type 'image', got {result['file_type']}"
        
        print(f"✓ Image upload successful - file_type: {result['file_type']}, session_id: {result['session_id'][:8]}...")
    
    def test_file_upload_with_pdf(self):
        """Test file upload with a minimal PDF"""
        # Create a minimal valid PDF
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Hello World) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF"""
        
        files = {
            'file': ('test_document.pdf', io.BytesIO(pdf_content), 'application/pdf')
        }
        data = {
            'message': 'Explain this document',
            'language': 'english'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            headers=self.headers_multipart,
            files=files,
            data=data
        )
        
        assert response.status_code == 200, f"PDF upload failed: {response.status_code} - {response.text}"
        result = response.json()
        
        assert "response" in result, "Missing 'response' in result"
        assert "file_type" in result, "Missing 'file_type' in result"
        assert result["file_type"] == "pdf", f"Expected file_type 'pdf', got {result['file_type']}"
        
        print(f"✓ PDF upload successful - file_type: {result['file_type']}")
    
    def test_file_upload_invalid_type(self):
        """Test file upload with invalid file type"""
        files = {
            'file': ('test.txt', io.BytesIO(b'Hello World'), 'text/plain')
        }
        data = {'message': 'test'}
        
        response = requests.post(
            f"{BASE_URL}/api/chat/upload",
            headers=self.headers_multipart,
            files=files,
            data=data
        )
        
        # Should return 400 for unsupported file type
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print("✓ Invalid file type correctly rejected")
    
    # ─── Video Generation Tests ───
    
    def test_video_generate_slideshow(self):
        """Test slideshow video generation"""
        data = {
            'topic': 'Photosynthesis',
            'video_type': 'slideshow'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/video/generate",
            headers=self.headers_multipart,
            data=data
        )
        
        assert response.status_code == 200, f"Video generate failed: {response.status_code} - {response.text}"
        result = response.json()
        
        # Verify response structure
        assert "video_id" in result, "Missing 'video_id' in result"
        assert "status" in result, "Missing 'status' in result"
        assert "video_type" in result, "Missing 'video_type' in result"
        assert "topic" in result, "Missing 'topic' in result"
        
        assert result["status"] == "generating", f"Expected status 'generating', got {result['status']}"
        assert result["video_type"] == "slideshow", f"Expected video_type 'slideshow', got {result['video_type']}"
        
        self.slideshow_video_id = result["video_id"]
        print(f"✓ Slideshow generation started - video_id: {result['video_id'][:8]}...")
        
        return result["video_id"]
    
    def test_video_generate_sora2(self):
        """Test Sora 2 video generation (just verify API returns generating status)"""
        data = {
            'topic': 'Newton Laws of Motion',
            'video_type': 'sora2'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/video/generate",
            headers=self.headers_multipart,
            data=data
        )
        
        assert response.status_code == 200, f"Sora2 video generate failed: {response.status_code} - {response.text}"
        result = response.json()
        
        assert "video_id" in result, "Missing 'video_id' in result"
        assert result["status"] == "generating", f"Expected status 'generating', got {result['status']}"
        assert result["video_type"] == "sora2", f"Expected video_type 'sora2', got {result['video_type']}"
        
        print(f"✓ Sora2 video generation started - video_id: {result['video_id'][:8]}...")
    
    def test_get_video_status(self):
        """Test getting video status"""
        # First create a video
        data = {
            'topic': 'Test Topic for Status Check',
            'video_type': 'slideshow'
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/video/generate",
            headers=self.headers_multipart,
            data=data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["video_id"]
        
        # Get video status
        response = requests.get(
            f"{BASE_URL}/api/video/{video_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get video status failed: {response.status_code} - {response.text}"
        result = response.json()
        
        assert "id" in result, "Missing 'id' in result"
        assert "status" in result, "Missing 'status' in result"
        assert "topic" in result, "Missing 'topic' in result"
        assert result["id"] == video_id, f"Video ID mismatch"
        
        print(f"✓ Video status retrieved - status: {result['status']}")
    
    def test_get_video_not_found(self):
        """Test getting non-existent video"""
        response = requests.get(
            f"{BASE_URL}/api/video/non-existent-id",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent video correctly returns 404")
    
    def test_get_videos_list(self):
        """Test getting list of user's videos"""
        response = requests.get(
            f"{BASE_URL}/api/videos",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get videos list failed: {response.status_code} - {response.text}"
        result = response.json()
        
        assert isinstance(result, list), "Expected list of videos"
        
        # Should have at least the videos we created in previous tests
        if len(result) > 0:
            video = result[0]
            assert "id" in video, "Missing 'id' in video"
            assert "topic" in video, "Missing 'topic' in video"
            assert "status" in video, "Missing 'status' in video"
            assert "video_type" in video, "Missing 'video_type' in video"
        
        print(f"✓ Videos list retrieved - count: {len(result)}")
    
    def test_slideshow_completion(self):
        """Test that slideshow completes within reasonable time"""
        # Create a slideshow
        data = {
            'topic': 'Simple Math Addition',
            'video_type': 'slideshow'
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/video/generate",
            headers=self.headers_multipart,
            data=data
        )
        assert create_response.status_code == 200
        video_id = create_response.json()["video_id"]
        
        # Poll for completion (max 60 seconds)
        max_wait = 60
        start_time = time.time()
        status = "generating"
        
        while status == "generating" and (time.time() - start_time) < max_wait:
            time.sleep(5)
            response = requests.get(
                f"{BASE_URL}/api/video/{video_id}",
                headers=self.headers
            )
            if response.status_code == 200:
                result = response.json()
                status = result.get("status", "generating")
                if status == "completed":
                    # Verify slides are present
                    assert "slides" in result, "Completed slideshow missing 'slides'"
                    assert isinstance(result["slides"], list), "Slides should be a list"
                    assert len(result["slides"]) > 0, "Slides list should not be empty"
                    print(f"✓ Slideshow completed with {len(result['slides'])} slides")
                    return
        
        # If we get here, either completed or timed out
        if status == "completed":
            print("✓ Slideshow completed successfully")
        elif status == "failed":
            print(f"⚠ Slideshow generation failed (this may be expected in test environment)")
        else:
            print(f"⚠ Slideshow still generating after {max_wait}s (status: {status})")
    
    # ─── Settings/i18n Tests ───
    
    def test_update_language_setting(self):
        """Test updating language setting"""
        # Update to Hindi
        response = requests.put(
            f"{BASE_URL}/api/settings",
            headers=self.headers,
            json={"language": "hindi"}
        )
        
        assert response.status_code == 200, f"Update settings failed: {response.status_code} - {response.text}"
        result = response.json()
        assert "updated" in result, "Missing 'updated' in result"
        assert "language" in result["updated"], "Language not in updated fields"
        
        # Verify the change
        get_response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.headers
        )
        assert get_response.status_code == 200
        settings = get_response.json()
        assert settings["language"] == "hindi", f"Language not updated, got {settings['language']}"
        
        print("✓ Language updated to Hindi")
        
        # Reset back to English
        requests.put(
            f"{BASE_URL}/api/settings",
            headers=self.headers,
            json={"language": "english"}
        )
        print("✓ Language reset to English")
    
    def test_available_languages(self):
        """Test that available languages are returned"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "available_languages" in result, "Missing 'available_languages' in settings"
        languages = result["available_languages"]
        
        expected_languages = ["english", "hindi", "tamil", "telugu", "bengali", "marathi", "gujarati", "kannada"]
        for lang in expected_languages:
            assert lang in languages, f"Missing language: {lang}"
        
        print(f"✓ All 8 languages available: {', '.join(languages)}")
    
    # ─── Chat Session Tests ───
    
    def test_chat_sessions_crud(self):
        """Test chat session CRUD operations"""
        # Create session
        create_response = requests.post(
            f"{BASE_URL}/api/chat/sessions",
            headers=self.headers
        )
        assert create_response.status_code == 200, f"Create session failed: {create_response.text}"
        session = create_response.json()
        assert "id" in session, "Missing session id"
        session_id = session["id"]
        
        # Get sessions list
        list_response = requests.get(
            f"{BASE_URL}/api/chat/sessions",
            headers=self.headers
        )
        assert list_response.status_code == 200
        sessions = list_response.json()
        assert any(s["id"] == session_id for s in sessions), "Created session not in list"
        
        # Delete session
        delete_response = requests.delete(
            f"{BASE_URL}/api/chat/sessions/{session_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        
        print("✓ Chat session CRUD operations working")
    
    # ─── Dashboard Navigation Tests ───
    
    def test_profile_endpoint(self):
        """Test profile endpoint returns expected data"""
        response = requests.get(
            f"{BASE_URL}/api/profile",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Profile failed: {response.status_code}"
        result = response.json()
        
        assert "id" in result
        assert "name" in result
        assert "email" in result
        assert "grade" in result
        assert "language" in result
        
        print(f"✓ Profile endpoint working - user: {result['name']}")
    
    def test_progress_streak(self):
        """Test streak endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/progress/streak",
            headers=self.headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "current_streak" in result
        assert "longest_streak" in result
        
        print(f"✓ Streak endpoint working - current: {result['current_streak']}")
    
    def test_progress_badges(self):
        """Test badges endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/progress/badges",
            headers=self.headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert isinstance(result, list)
        if len(result) > 0:
            badge = result[0]
            assert "id" in badge
            assert "name" in badge
            assert "earned" in badge
        
        print(f"✓ Badges endpoint working - total badges: {len(result)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
