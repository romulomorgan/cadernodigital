#!/usr/bin/env python3
"""
IUDP Sistema - Backend Testing for Month Closure Functionality
Testing POST /api/month/close and POST /api/month/reopen endpoints
"""

import requests
import json
import jwt
import time
from datetime import datetime, timedelta
from pymongo import MongoClient
import os

# Configuration
BASE_URL = "https://iudp-ledger.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"
JWT_SECRET = "iudp-secret-key-2025"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "iudp_control"

class IUDPTester:
    def __init__(self):
        self.session = requests.Session()
        self.master_token = None
        self.regular_token = None
        self.mongo_client = None
        self.db = None
        
    def setup_database_connection(self):
        """Setup MongoDB connection for direct DB verification"""
        try:
            self.mongo_client = MongoClient(MONGO_URL)
            self.db = self.mongo_client[DB_NAME]
            print("✅ Database connection established")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False
    
    def create_test_tokens(self):
        """Create JWT tokens for testing"""
        try:
            # Master user token
            master_payload = {
                "userId": "master-test-user-id",
                "email": "master@iudp.com",
                "role": "master",
                "exp": datetime.utcnow() + timedelta(hours=1)
            }
            self.master_token = jwt.encode(master_payload, JWT_SECRET, algorithm="HS256")
            
            # Regular user token
            regular_payload = {
                "userId": "regular-test-user-id", 
                "email": "pastor@iudp.com",
                "role": "pastor",
                "exp": datetime.utcnow() + timedelta(hours=1)
            }
            self.regular_token = jwt.encode(regular_payload, JWT_SECRET, algorithm="HS256")
            
            print("✅ Test tokens created successfully")
            return True
        except Exception as e:
            print(f"❌ Token creation failed: {e}")
            return False
    
    def test_authentication_scenarios(self):
        """Test authentication and authorization for month closure endpoints"""
        print("\n=== TESTING AUTHENTICATION & AUTHORIZATION ===")
        
        test_data = {"month": 6, "year": 2025}
        
        # Test 1: No token (should return 401)
        print("\n1. Testing without authentication token...")
        try:
            response = self.session.post(f"{API_BASE}/month/close", json=test_data)
            if response.status_code == 401:
                print("✅ Correctly rejected request without token (401)")
            else:
                print(f"❌ Expected 401, got {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ Request failed: {e}")
        
        # Test 2: Regular user token (should return 403)
        print("\n2. Testing with regular user token...")
        try:
            headers = {"Authorization": f"Bearer {self.regular_token}"}
            response = self.session.post(f"{API_BASE}/month/close", json=test_data, headers=headers)
            if response.status_code == 403:
                print("✅ Correctly rejected regular user (403)")
            else:
                print(f"❌ Expected 403, got {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ Request failed: {e}")
        
        # Test 3: Master user token (should work)
        print("\n3. Testing with master user token...")
        try:
            headers = {"Authorization": f"Bearer {self.master_token}"}
            response = self.session.post(f"{API_BASE}/month/close", json=test_data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    print("✅ Master user successfully authorized")
                    return True
                else:
                    print(f"❌ Success flag not set: {result}")
            else:
                print(f"❌ Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ Request failed: {e}")
        
        return False
    
    def test_close_month_functionality(self):
        """Test month closing functionality"""
        print("\n=== TESTING MONTH CLOSE FUNCTIONALITY ===")
        
        headers = {"Authorization": f"Bearer {self.master_token}"}
        test_data = {"month": 6, "year": 2025}
        
        # Clear any existing month status for clean test
        try:
            self.db.month_status.delete_one({"month": 6, "year": 2025})
            print("✅ Cleared existing month status for clean test")
        except Exception as e:
            print(f"⚠️ Could not clear existing data: {e}")
        
        print("\n1. Testing POST /api/month/close...")
        try:
            response = self.session.post(f"{API_BASE}/month/close", json=test_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    print("✅ Month close API returned success")
                    
                    # Verify database persistence
                    print("\n2. Verifying database persistence...")
                    month_status = self.db.month_status.find_one({"month": 6, "year": 2025})
                    
                    if month_status:
                        if month_status.get("closed") == True:
                            print("✅ Month status correctly saved as closed in database")
                            print(f"   - Closed by: {month_status.get('closedBy')}")
                            print(f"   - Closed at: {month_status.get('closedAt')}")
                        else:
                            print(f"❌ Month not marked as closed: {month_status}")
                            return False
                    else:
                        print("❌ Month status not found in database")
                        return False
                    
                    # Verify audit log
                    print("\n3. Verifying audit log...")
                    audit_log = self.db.audit_logs.find_one(
                        {"action": "close_month", "details.month": 6, "details.year": 2025},
                        sort=[("timestamp", -1)]
                    )
                    
                    if audit_log:
                        print("✅ Audit log correctly created")
                        print(f"   - Action: {audit_log.get('action')}")
                        print(f"   - User ID: {audit_log.get('userId')}")
                        print(f"   - Timestamp: {audit_log.get('timestamp')}")
                    else:
                        print("❌ Audit log not found")
                        return False
                    
                    return True
                else:
                    print(f"❌ API returned success=false: {result}")
            else:
                print(f"❌ Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ Request failed: {e}")
        
        return False
    
    def test_reopen_month_functionality(self):
        """Test month reopening functionality"""
        print("\n=== TESTING MONTH REOPEN FUNCTIONALITY ===")
        
        headers = {"Authorization": f"Bearer {self.master_token}"}
        test_data = {"month": 6, "year": 2025}
        
        print("\n1. Testing POST /api/month/reopen...")
        try:
            response = self.session.post(f"{API_BASE}/month/reopen", json=test_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    print("✅ Month reopen API returned success")
                    
                    # Verify database persistence
                    print("\n2. Verifying database persistence...")
                    month_status = self.db.month_status.find_one({"month": 6, "year": 2025})
                    
                    if month_status:
                        if month_status.get("closed") == False:
                            print("✅ Month status correctly updated as reopened in database")
                            print(f"   - Reopened by: {month_status.get('reopenedBy')}")
                            print(f"   - Reopened at: {month_status.get('reopenedAt')}")
                        else:
                            print(f"❌ Month still marked as closed: {month_status}")
                            return False
                    else:
                        print("❌ Month status not found in database")
                        return False
                    
                    # Verify audit log
                    print("\n3. Verifying audit log...")
                    audit_log = self.db.audit_logs.find_one(
                        {"action": "reopen_month", "details.month": 6, "details.year": 2025},
                        sort=[("timestamp", -1)]
                    )
                    
                    if audit_log:
                        print("✅ Audit log correctly created")
                        print(f"   - Action: {audit_log.get('action')}")
                        print(f"   - User ID: {audit_log.get('userId')}")
                        print(f"   - Timestamp: {audit_log.get('timestamp')}")
                    else:
                        print("❌ Audit log not found")
                        return False
                    
                    return True
                else:
                    print(f"❌ API returned success=false: {result}")
            else:
                print(f"❌ Expected 200, got {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ Request failed: {e}")
        
        return False
    
    def test_complete_flow(self):
        """Test complete close -> reopen -> close flow"""
        print("\n=== TESTING COMPLETE FLOW ===")
        
        headers = {"Authorization": f"Bearer {self.master_token}"}
        test_data = {"month": 7, "year": 2025}  # Use different month for flow test
        
        # Clear any existing data
        try:
            self.db.month_status.delete_one({"month": 7, "year": 2025})
        except:
            pass
        
        print("\n1. Step 1: Close month...")
        try:
            response = self.session.post(f"{API_BASE}/month/close", json=test_data, headers=headers)
            if response.status_code == 200 and response.json().get("success"):
                month_status = self.db.month_status.find_one({"month": 7, "year": 2025})
                if month_status and month_status.get("closed") == True:
                    print("✅ Step 1 passed: Month closed successfully")
                else:
                    print("❌ Step 1 failed: Month not closed in database")
                    return False
            else:
                print(f"❌ Step 1 failed: API error {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Step 1 failed: {e}")
            return False
        
        print("\n2. Step 2: Reopen month...")
        try:
            response = self.session.post(f"{API_BASE}/month/reopen", json=test_data, headers=headers)
            if response.status_code == 200 and response.json().get("success"):
                month_status = self.db.month_status.find_one({"month": 7, "year": 2025})
                if month_status and month_status.get("closed") == False:
                    print("✅ Step 2 passed: Month reopened successfully")
                else:
                    print("❌ Step 2 failed: Month not reopened in database")
                    return False
            else:
                print(f"❌ Step 2 failed: API error {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Step 2 failed: {e}")
            return False
        
        print("\n3. Step 3: Close month again...")
        try:
            response = self.session.post(f"{API_BASE}/month/close", json=test_data, headers=headers)
            if response.status_code == 200 and response.json().get("success"):
                month_status = self.db.month_status.find_one({"month": 7, "year": 2025})
                if month_status and month_status.get("closed") == True:
                    print("✅ Step 3 passed: Month closed again successfully")
                    return True
                else:
                    print("❌ Step 3 failed: Month not closed in database")
                    return False
            else:
                print(f"❌ Step 3 failed: API error {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Step 3 failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run all tests and return summary"""
        print("🚀 STARTING IUDP MONTH CLOSURE BACKEND TESTS")
        print("=" * 60)
        
        # Setup
        if not self.setup_database_connection():
            return False
        
        if not self.create_test_tokens():
            return False
        
        # Run tests
        results = {
            "authentication": self.test_authentication_scenarios(),
            "close_month": self.test_close_month_functionality(),
            "reopen_month": self.test_reopen_month_functionality(),
            "complete_flow": self.test_complete_flow()
        }
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Month closure functionality is working correctly.")
            return True
        else:
            print("⚠️ Some tests failed. Please check the detailed output above.")
            return False
    
    def cleanup(self):
        """Cleanup resources"""
        if self.mongo_client:
            self.mongo_client.close()

def main():
    tester = IUDPTester()
    try:
        success = tester.run_all_tests()
        return success
    finally:
        tester.cleanup()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)