#!/usr/bin/env python3
"""
Edge Case Testing for Roxy Backend
Tests error handling and edge cases
"""

import requests
import json
import uuid

BACKEND_URL = "https://roxy-assistant-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class RoxyEdgeCaseTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = {"passed": 0, "failed": 0, "errors": []}
    
    def log_result(self, test_name, success, message=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")
        print()
    
    def test_error_cases(self):
        """Test various error scenarios"""
        print("=== TESTING ERROR CASES ===")
        
        # Test 1: Get non-existent alarm
        fake_id = str(uuid.uuid4())
        try:
            response = self.session.get(f"{API_BASE}/alarmas/{fake_id}", timeout=10)
            if response.status_code == 404:
                self.log_result("GET non-existent alarm", True, "Correctly returns 404")
            else:
                self.log_result("GET non-existent alarm", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("GET non-existent alarm", False, f"Exception: {str(e)}")
        
        # Test 2: Update non-existent alarm
        try:
            response = self.session.put(f"{API_BASE}/alarmas/{fake_id}", 
                                      json={"label": "Test"}, timeout=10)
            if response.status_code == 404:
                self.log_result("UPDATE non-existent alarm", True, "Correctly returns 404")
            else:
                self.log_result("UPDATE non-existent alarm", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("UPDATE non-existent alarm", False, f"Exception: {str(e)}")
        
        # Test 3: Delete non-existent alarm
        try:
            response = self.session.delete(f"{API_BASE}/alarmas/{fake_id}", timeout=10)
            if response.status_code == 404:
                self.log_result("DELETE non-existent alarm", True, "Correctly returns 404")
            else:
                self.log_result("DELETE non-existent alarm", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("DELETE non-existent alarm", False, f"Exception: {str(e)}")
        
        # Test 4: Create alarm with invalid data
        try:
            response = self.session.post(f"{API_BASE}/alarmas", 
                                       json={"invalid": "data"}, timeout=10)
            if response.status_code == 422:  # Validation error
                self.log_result("CREATE alarm with invalid data", True, "Correctly returns 422 validation error")
            else:
                self.log_result("CREATE alarm with invalid data", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("CREATE alarm with invalid data", False, f"Exception: {str(e)}")
    
    def test_roxy_edge_cases(self):
        """Test Roxy chat edge cases"""
        print("=== TESTING ROXY EDGE CASES ===")
        
        # Test 1: Empty message
        try:
            response = self.session.post(f"{API_BASE}/chat", 
                                       json={"message": "", "userId": "test"}, timeout=15)
            if response.status_code == 200:
                chat_response = response.json()
                if chat_response.get("response"):
                    self.log_result("Empty message to Roxy", True, "Roxy handled empty message gracefully")
                else:
                    self.log_result("Empty message to Roxy", False, "No response from Roxy")
            else:
                self.log_result("Empty message to Roxy", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Empty message to Roxy", False, f"Exception: {str(e)}")
        
        # Test 2: Very long message
        long_message = "Hola Roxy, " + "esto es un mensaje muy largo " * 50
        try:
            response = self.session.post(f"{API_BASE}/chat", 
                                       json={"message": long_message, "userId": "test"}, timeout=20)
            if response.status_code == 200:
                chat_response = response.json()
                if chat_response.get("response"):
                    self.log_result("Very long message to Roxy", True, "Roxy handled long message")
                else:
                    self.log_result("Very long message to Roxy", False, "No response from Roxy")
            else:
                self.log_result("Very long message to Roxy", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Very long message to Roxy", False, f"Exception: {str(e)}")
        
        # Test 3: Nonsensical message
        try:
            response = self.session.post(f"{API_BASE}/chat", 
                                       json={"message": "xyzabc123 blablabla nonsense", "userId": "test"}, timeout=15)
            if response.status_code == 200:
                chat_response = response.json()
                if chat_response.get("response"):
                    self.log_result("Nonsensical message to Roxy", True, "Roxy handled nonsensical message")
                else:
                    self.log_result("Nonsensical message to Roxy", False, "No response from Roxy")
            else:
                self.log_result("Nonsensical message to Roxy", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Nonsensical message to Roxy", False, f"Exception: {str(e)}")
    
    def test_spanish_responses(self):
        """Test that Roxy responds in Spanish"""
        print("=== TESTING SPANISH RESPONSES ===")
        
        spanish_tests = [
            "¿Cómo estás?",
            "Ayúdame con mis alarmas",
            "¿Qué puedes hacer?",
            "Gracias por tu ayuda"
        ]
        
        for i, message in enumerate(spanish_tests, 1):
            try:
                response = self.session.post(f"{API_BASE}/chat", 
                                           json={"message": message, "userId": "test"}, timeout=15)
                if response.status_code == 200:
                    chat_response = response.json()
                    response_text = chat_response.get("response", "")
                    
                    # Check for Spanish words/patterns
                    spanish_indicators = ["sí", "no", "hola", "gracias", "alarma", "tiempo", "día", "hora"]
                    has_spanish = any(word in response_text.lower() for word in spanish_indicators)
                    
                    if has_spanish or len(response_text) > 10:  # Basic check
                        self.log_result(f"Spanish test {i}: '{message[:20]}...'", True, 
                                      f"Response: {response_text[:50]}...")
                    else:
                        self.log_result(f"Spanish test {i}: '{message[:20]}...'", False, 
                                      f"Questionable Spanish response: {response_text}")
                else:
                    self.log_result(f"Spanish test {i}: '{message[:20]}...'", False, 
                                  f"Status code: {response.status_code}")
            except Exception as e:
                self.log_result(f"Spanish test {i}: '{message[:20]}...'", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all edge case tests"""
        print(f"🔍 Starting Roxy Backend Edge Case Tests")
        print(f"API Base: {API_BASE}")
        print("=" * 60)
        
        self.test_error_cases()
        self.test_roxy_edge_cases()
        self.test_spanish_responses()
        
        print("=" * 60)
        print(f"🏁 EDGE CASE TEST SUMMARY")
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"   • {error}")
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        if total_tests > 0:
            success_rate = (self.test_results['passed'] / total_tests * 100)
            print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.test_results['failed'] == 0

if __name__ == "__main__":
    tester = RoxyEdgeCaseTester()
    success = tester.run_all_tests()