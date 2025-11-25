#!/usr/bin/env python3
"""
Backend Testing Suite for Roxy - Aplicación de Alarmas con Asistente IA
Tests all backend APIs including CRUD operations and AI chat functionality
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import os
import sys

# Get backend URL from frontend .env file
BACKEND_URL = "https://roxy-assistant-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class RoxyBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.created_alarm_ids = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message="", response=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code} - {response.text[:200]}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")
        print()
    
    def test_health_endpoints(self):
        """Test basic health check endpoints"""
        print("=== TESTING HEALTH ENDPOINTS ===")
        
        # Test /api/health
        try:
            response = self.session.get(f"{API_BASE}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_result("GET /api/health", True, "Health check passed")
                else:
                    self.log_result("GET /api/health", False, f"Unexpected response: {data}")
            else:
                self.log_result("GET /api/health", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("GET /api/health", False, f"Exception: {str(e)}")
        
        # Test /api/
        try:
            response = self.session.get(f"{API_BASE}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "Roxy Backend API" in data.get("message", ""):
                    self.log_result("GET /api/", True, "Root endpoint working")
                else:
                    self.log_result("GET /api/", False, f"Unexpected message: {data}")
            else:
                self.log_result("GET /api/", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("GET /api/", False, f"Exception: {str(e)}")
    
    def test_alarmas_crud(self):
        """Test complete CRUD operations for alarmas"""
        print("=== TESTING ALARMAS CRUD ===")
        
        # Test 1: Create alarm (POST /api/alarmas)
        tomorrow = (datetime.now() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
        alarm_data = {
            "label": "Reunión importante con el equipo",
            "datetime": tomorrow.isoformat(),
            "repeatPattern": None,
            "repeatDays": [],
            "sound": "default"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/alarmas", json=alarm_data, timeout=10)
            if response.status_code == 200:
                created_alarm = response.json()
                if created_alarm.get("id") and created_alarm.get("label") == alarm_data["label"]:
                    self.created_alarm_ids.append(created_alarm["id"])
                    self.log_result("POST /api/alarmas", True, f"Alarm created with ID: {created_alarm['id']}")
                    alarm_id = created_alarm["id"]
                else:
                    self.log_result("POST /api/alarmas", False, f"Invalid response structure: {created_alarm}")
                    return
            else:
                self.log_result("POST /api/alarmas", False, f"Status code: {response.status_code}", response)
                return
        except Exception as e:
            self.log_result("POST /api/alarmas", False, f"Exception: {str(e)}")
            return
        
        # Test 2: Get all alarms (GET /api/alarmas)
        try:
            response = self.session.get(f"{API_BASE}/alarmas", timeout=10)
            if response.status_code == 200:
                alarms = response.json()
                if isinstance(alarms, list) and len(alarms) > 0:
                    found_our_alarm = any(alarm.get("id") == alarm_id for alarm in alarms)
                    if found_our_alarm:
                        self.log_result("GET /api/alarmas", True, f"Retrieved {len(alarms)} alarms, including our created alarm")
                    else:
                        self.log_result("GET /api/alarmas", False, "Created alarm not found in list")
                else:
                    self.log_result("GET /api/alarmas", True, "Empty alarm list returned (valid)")
            else:
                self.log_result("GET /api/alarmas", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("GET /api/alarmas", False, f"Exception: {str(e)}")
        
        # Test 3: Get specific alarm (GET /api/alarmas/{id})
        try:
            response = self.session.get(f"{API_BASE}/alarmas/{alarm_id}", timeout=10)
            if response.status_code == 200:
                alarm = response.json()
                if alarm.get("id") == alarm_id and alarm.get("label") == alarm_data["label"]:
                    self.log_result("GET /api/alarmas/{id}", True, f"Retrieved specific alarm: {alarm['label']}")
                else:
                    self.log_result("GET /api/alarmas/{id}", False, f"Alarm data mismatch: {alarm}")
            else:
                self.log_result("GET /api/alarmas/{id}", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("GET /api/alarmas/{id}", False, f"Exception: {str(e)}")
        
        # Test 4: Update alarm (PUT /api/alarmas/{id})
        update_data = {
            "label": "Reunión ACTUALIZADA con el equipo",
            "isActive": False
        }
        
        try:
            response = self.session.put(f"{API_BASE}/alarmas/{alarm_id}", json=update_data, timeout=10)
            if response.status_code == 200:
                updated_alarm = response.json()
                if (updated_alarm.get("label") == update_data["label"] and 
                    updated_alarm.get("isActive") == update_data["isActive"]):
                    self.log_result("PUT /api/alarmas/{id}", True, f"Alarm updated successfully")
                else:
                    self.log_result("PUT /api/alarmas/{id}", False, f"Update not reflected: {updated_alarm}")
            else:
                self.log_result("PUT /api/alarmas/{id}", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("PUT /api/alarmas/{id}", False, f"Exception: {str(e)}")
        
        # Test 5: Delete alarm (DELETE /api/alarmas/{id})
        try:
            response = self.session.delete(f"{API_BASE}/alarmas/{alarm_id}", timeout=10)
            if response.status_code == 200:
                result = response.json()
                if "eliminada exitosamente" in result.get("message", ""):
                    self.log_result("DELETE /api/alarmas/{id}", True, "Alarm deleted successfully")
                    self.created_alarm_ids.remove(alarm_id)
                else:
                    self.log_result("DELETE /api/alarmas/{id}", False, f"Unexpected delete response: {result}")
            else:
                self.log_result("DELETE /api/alarmas/{id}", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("DELETE /api/alarmas/{id}", False, f"Exception: {str(e)}")
        
        # Test 6: Try to get deleted alarm (should return 404)
        try:
            response = self.session.get(f"{API_BASE}/alarmas/{alarm_id}", timeout=10)
            if response.status_code == 404:
                self.log_result("GET deleted alarm (404 test)", True, "Correctly returns 404 for deleted alarm")
            else:
                self.log_result("GET deleted alarm (404 test)", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("GET deleted alarm (404 test)", False, f"Exception: {str(e)}")
    
    def test_roxy_chat(self):
        """Test Roxy AI chat functionality"""
        print("=== TESTING ROXY CHAT ===")
        
        # Test 1: Ask Roxy what alarms exist
        chat_data = {
            "message": "¿Qué alarmas tengo?",
            "userId": "test_user"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/chat", json=chat_data, timeout=15)
            if response.status_code == 200:
                chat_response = response.json()
                if (chat_response.get("response") and 
                    isinstance(chat_response.get("actions"), list)):
                    self.log_result("POST /api/chat (list alarms)", True, 
                                  f"Roxy responded: {chat_response['response'][:100]}...")
                else:
                    self.log_result("POST /api/chat (list alarms)", False, 
                                  f"Invalid response structure: {chat_response}")
            else:
                self.log_result("POST /api/chat (list alarms)", False, 
                              f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("POST /api/chat (list alarms)", False, f"Exception: {str(e)}")
        
        # Test 2: Ask Roxy to create an alarm
        tomorrow_evening = (datetime.now() + timedelta(days=1)).replace(hour=19, minute=0)
        chat_data = {
            "message": f"Crea una alarma para mañana a las 19:00 para estudiar programación",
            "userId": "test_user"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/chat", json=chat_data, timeout=15)
            if response.status_code == 200:
                chat_response = response.json()
                if (chat_response.get("response") and 
                    isinstance(chat_response.get("actions"), list)):
                    
                    # Check if an alarm was actually created
                    actions = chat_response.get("actions", [])
                    alarm_created = any(action.get("tipo") == "alarma_creada" for action in actions)
                    
                    if alarm_created:
                        # Store the created alarm ID for cleanup
                        for action in actions:
                            if action.get("tipo") == "alarma_creada":
                                alarm_id = action.get("alarma", {}).get("id")
                                if alarm_id:
                                    self.created_alarm_ids.append(alarm_id)
                        
                        self.log_result("POST /api/chat (create alarm)", True, 
                                      f"Roxy created alarm: {chat_response['response'][:100]}...")
                    else:
                        self.log_result("POST /api/chat (create alarm)", False, 
                                      f"No alarm created. Response: {chat_response['response']}")
                else:
                    self.log_result("POST /api/chat (create alarm)", False, 
                                  f"Invalid response structure: {chat_response}")
            else:
                self.log_result("POST /api/chat (create alarm)", False, 
                              f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("POST /api/chat (create alarm)", False, f"Exception: {str(e)}")
        
        # Test 3: Ask Roxy to create a recurring alarm
        chat_data = {
            "message": "Recuérdame hacer ejercicio todos los días a las 18:00",
            "userId": "test_user"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/chat", json=chat_data, timeout=15)
            if response.status_code == 200:
                chat_response = response.json()
                if (chat_response.get("response") and 
                    isinstance(chat_response.get("actions"), list)):
                    
                    # Check if a recurring alarm was created
                    actions = chat_response.get("actions", [])
                    alarm_created = any(action.get("tipo") == "alarma_creada" for action in actions)
                    
                    if alarm_created:
                        # Store the created alarm ID for cleanup
                        for action in actions:
                            if action.get("tipo") == "alarma_creada":
                                alarm_id = action.get("alarma", {}).get("id")
                                if alarm_id:
                                    self.created_alarm_ids.append(alarm_id)
                        
                        self.log_result("POST /api/chat (recurring alarm)", True, 
                                      f"Roxy created recurring alarm: {chat_response['response'][:100]}...")
                    else:
                        self.log_result("POST /api/chat (recurring alarm)", False, 
                                      f"No recurring alarm created. Response: {chat_response['response']}")
                else:
                    self.log_result("POST /api/chat (recurring alarm)", False, 
                                  f"Invalid response structure: {chat_response}")
            else:
                self.log_result("POST /api/chat (recurring alarm)", False, 
                              f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("POST /api/chat (recurring alarm)", False, f"Exception: {str(e)}")
    
    def test_chat_history(self):
        """Test chat history endpoint"""
        print("=== TESTING CHAT HISTORY ===")
        
        try:
            response = self.session.get(f"{API_BASE}/chat/history?userId=test_user", timeout=10)
            if response.status_code == 200:
                history = response.json()
                if isinstance(history, list):
                    self.log_result("GET /api/chat/history", True, 
                                  f"Retrieved {len(history)} chat messages")
                else:
                    self.log_result("GET /api/chat/history", False, 
                                  f"Expected list, got: {type(history)}")
            else:
                self.log_result("GET /api/chat/history", False, 
                              f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("GET /api/chat/history", False, f"Exception: {str(e)}")
    
    def cleanup_created_alarms(self):
        """Clean up any alarms created during testing"""
        print("=== CLEANUP ===")
        for alarm_id in self.created_alarm_ids:
            try:
                response = self.session.delete(f"{API_BASE}/alarmas/{alarm_id}", timeout=10)
                if response.status_code == 200:
                    print(f"✅ Cleaned up alarm: {alarm_id}")
                else:
                    print(f"⚠️  Failed to cleanup alarm: {alarm_id}")
            except Exception as e:
                print(f"⚠️  Error cleaning up alarm {alarm_id}: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Roxy Backend Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API Base: {API_BASE}")
        print("=" * 60)
        
        try:
            self.test_health_endpoints()
            self.test_alarmas_crud()
            self.test_roxy_chat()
            self.test_chat_history()
        finally:
            self.cleanup_created_alarms()
        
        print("=" * 60)
        print(f"🏁 TEST SUMMARY")
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.test_results['passed'] / 
                       (self.test_results['passed'] + self.test_results['failed']) * 100)
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        return self.test_results['failed'] == 0

if __name__ == "__main__":
    tester = RoxyBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)