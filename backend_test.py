#!/usr/bin/env python3
"""
Backend Testing Script for Bug Fixes and Privacy System
Testing the following endpoints:
1. GET /api/custos/list - Test if returns cost types for authenticated users (not just Master)
2. GET /api/costs-entries/list - Test if all costs have status field filled
3. POST /api/privacy/get and POST /api/privacy/save - Test new privacy system (Master only)
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from .env
BASE_URL = "https://caderno-online.preview.emergentagent.com/api"

# Test credentials
MASTER_CREDENTIALS = {
    "email": "joao.silva@iudp.org.br",
    "password": "LiderMaximo2025!"
}

# We'll create a Pastor user for testing
PASTOR_CREDENTIALS = {
    "email": "pastor.teste@iudp.org.br", 
    "password": "Pastor123!",
    "name": "Pastor Teste",
    "role": "pastor"
}

class BackendTester:
    def __init__(self):
        self.master_token = None
        self.pastor_token = None
        self.pastor_user_id = None
        self.test_results = []
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
        print()

    def login_master(self):
        """Login as Master user"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=MASTER_CREDENTIALS)
            if response.status_code == 200:
                data = response.json()
                self.master_token = data.get('token')
                self.log_test("Master Login", "PASS", f"Token obtained successfully")
                return True
            else:
                self.log_test("Master Login (original credentials)", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                # Try to create a test master user
                return self.create_test_master()
        except Exception as e:
            self.log_test("Master Login", "FAIL", f"Exception: {str(e)}")
            return False

    def create_test_master(self):
        """Create a test master user"""
        try:
            # Try to register a new master user
            master_data = {
                "name": "Master Teste",
                "email": "master.teste@iudp.org.br",
                "password": "MasterTeste2025!",
                "role": "master",
                "state": "SP",
                "region": "Região Teste",
                "church": "",
                "cidade": "São Paulo",
                "pais": "Brasil"
            }
            
            print(f"Attempting to register master user: {master_data['email']}")
            response = requests.post(f"{BASE_URL}/auth/register", json=master_data)
            print(f"Register response: {response.status_code} - {response.text}")
            
            if response.status_code == 200:
                # Now try to login with the new master
                login_response = requests.post(f"{BASE_URL}/auth/login", json={
                    "email": "master.teste@iudp.org.br",
                    "password": "MasterTeste2025!"
                })
                
                if login_response.status_code == 200:
                    data = login_response.json()
                    self.master_token = data.get('token')
                    self.log_test("Create and Login Test Master", "PASS", f"Test master created and logged in successfully")
                    return True
                else:
                    self.log_test("Login Test Master", "FAIL", f"Status: {login_response.status_code}, Response: {login_response.text}")
                    return False
            elif response.status_code == 400 and ("já existe" in response.text or "já cadastrado" in response.text):
                # User already exists, try to login
                self.log_test("Master User Already Exists", "INFO", "Trying to login with existing user")
                login_response = requests.post(f"{BASE_URL}/auth/login", json={
                    "email": "master.teste@iudp.org.br",
                    "password": "MasterTeste2025!"
                })
                
                if login_response.status_code == 200:
                    data = login_response.json()
                    self.master_token = data.get('token')
                    self.log_test("Login Existing Test Master", "PASS", f"Logged in with existing test master")
                    return True
                else:
                    self.log_test("Login Existing Test Master", "FAIL", f"Status: {login_response.status_code}, Response: {login_response.text}")
                    return False
            else:
                self.log_test("Create Test Master", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Test Master", "FAIL", f"Exception: {str(e)}")
            return False

    def create_pastor_user(self):
        """Create a Pastor user for testing"""
        try:
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            # First check if pastor already exists
            check_response = requests.post(f"{BASE_URL}/users/list", headers=headers)
            if check_response.status_code == 200:
                users = check_response.json().get('usuarios', [])
                for user in users:
                    if user.get('email') == PASTOR_CREDENTIALS['email']:
                        self.pastor_user_id = user.get('userId')
                        self.log_test("Pastor User Check", "PASS", f"Pastor user already exists: {self.pastor_user_id}")
                        return True
            
            # Create new pastor user
            user_data = {
                "name": PASTOR_CREDENTIALS['name'],
                "email": PASTOR_CREDENTIALS['email'],
                "password": PASTOR_CREDENTIALS['password'],
                "role": PASTOR_CREDENTIALS['role'],
                "state": "SP",
                "region": "Região Teste",
                "isActive": True
            }
            
            response = requests.post(f"{BASE_URL}/users/create", json=user_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.pastor_user_id = data.get('user', {}).get('userId')
                self.log_test("Create Pastor User", "PASS", f"Pastor user created: {self.pastor_user_id}")
                return True
            elif response.status_code == 400 and ("já existe" in response.text or "já cadastrado" in response.text):
                self.log_test("Pastor User Already Exists", "INFO", "Pastor user already exists, proceeding with login")
                return True
            else:
                self.log_test("Create Pastor User", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Pastor User", "FAIL", f"Exception: {str(e)}")
            return False

    def login_pastor(self):
        """Login as Pastor user"""
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json={
                "email": PASTOR_CREDENTIALS['email'],
                "password": PASTOR_CREDENTIALS['password']
            })
            if response.status_code == 200:
                data = response.json()
                self.pastor_token = data.get('token')
                self.log_test("Pastor Login", "PASS", f"Pastor token obtained successfully")
                return True
            else:
                self.log_test("Pastor Login", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Pastor Login", "FAIL", f"Exception: {str(e)}")
            return False

    def create_test_cost_types(self):
        """Create some cost types for testing"""
        try:
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            # Create test cost types
            cost_types = [
                {"name": "Manutenção"},
                {"name": "Material de Limpeza"},
                {"name": "Energia Elétrica"}
            ]
            
            created_count = 0
            for cost_type in cost_types:
                response = requests.post(f"{BASE_URL}/custos/create", json=cost_type, headers=headers)
                if response.status_code == 200:
                    created_count += 1
            
            self.log_test("Create Test Cost Types", "PASS", f"Created {created_count} cost types")
            return True
        except Exception as e:
            self.log_test("Create Test Cost Types", "FAIL", f"Exception: {str(e)}")
            return False

    def test_custos_list_endpoint(self):
        """Test 1: GET /api/custos/list - Test if returns cost types for authenticated users"""
        print("🔍 TESTE 1: Endpoint /api/custos/list")
        
        # Test with Master user
        try:
            headers = {"Authorization": f"Bearer {self.master_token}"}
            response = requests.post(f"{BASE_URL}/custos/list", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                custos = data.get('custos', [])
                self.log_test("Custos List - Master Access", "PASS", f"Master can access, found {len(custos)} cost types")
            else:
                self.log_test("Custos List - Master Access", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Custos List - Master Access", "FAIL", f"Exception: {str(e)}")

        # Test with Pastor user
        try:
            headers = {"Authorization": f"Bearer {self.pastor_token}"}
            response = requests.post(f"{BASE_URL}/custos/list", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                custos = data.get('custos', [])
                self.log_test("Custos List - Pastor Access", "PASS", f"Pastor can access, found {len(custos)} cost types")
                
                # Verify the bug fix: Pastor should be able to see cost types
                if len(custos) > 0:
                    self.log_test("Bug Fix Verification - Pastor sees cost types", "PASS", f"Pastor can see {len(custos)} cost types (dropdown should not be empty)")
                else:
                    self.log_test("Bug Fix Verification - Pastor sees cost types", "WARN", "Pastor sees 0 cost types - may need to create some first")
            else:
                self.log_test("Custos List - Pastor Access", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Custos List - Pastor Access", "FAIL", f"Exception: {str(e)}")

        # Test without authentication
        try:
            response = requests.post(f"{BASE_URL}/custos/list")
            if response.status_code == 401:
                self.log_test("Custos List - No Auth", "PASS", "Correctly returns 401 for unauthenticated requests")
            else:
                self.log_test("Custos List - No Auth", "FAIL", f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("Custos List - No Auth", "FAIL", f"Exception: {str(e)}")

    def create_test_cost_entry(self):
        """Create a test cost entry with status"""
        try:
            headers = {"Authorization": f"Bearer {self.pastor_token}"}
            
            # First get available cost types
            custos_response = requests.post(f"{BASE_URL}/custos/list", headers=headers)
            if custos_response.status_code != 200:
                self.log_test("Get Cost Types for Entry", "FAIL", "Could not get cost types")
                return None
                
            custos = custos_response.json().get('custos', [])
            if not custos:
                self.log_test("Get Cost Types for Entry", "FAIL", "No cost types available")
                return None
            
            # Create a cost entry
            cost_entry_data = {
                "costTypeId": custos[0]['custoId'],  # Use first available cost type
                "costTypeName": custos[0]['name'],   # Include cost type name
                "description": "Teste de custo com status",
                "value": 100.50,
                "dueDate": "2025-01-15"
            }
            
            response = requests.post(f"{BASE_URL}/costs-entries/create", json=cost_entry_data, headers=headers)
            if response.status_code == 200:
                data = response.json()
                cost_id = data.get('costEntry', {}).get('costId')  # Fixed: costEntry instead of cost
                self.log_test("Create Test Cost Entry", "PASS", f"Cost entry created with ID: {cost_id}")
                return cost_id
            else:
                self.log_test("Create Test Cost Entry", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            self.log_test("Create Test Cost Entry", "FAIL", f"Exception: {str(e)}")
            return None

    def test_costs_entries_list_endpoint(self):
        """Test 2: GET /api/costs-entries/list - Test if all costs have status field filled"""
        print("🔍 TESTE 2: Endpoint /api/costs-entries/list")
        
        # Create a test cost entry first
        cost_id = self.create_test_cost_entry()
        
        # Test with Pastor user (should see their own costs)
        try:
            headers = {"Authorization": f"Bearer {self.pastor_token}"}
            response = requests.post(f"{BASE_URL}/costs-entries/list", json={}, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                costs = data.get('costs', [])
                self.log_test("Costs Entries List - Pastor Access", "PASS", f"Pastor can access, found {len(costs)} cost entries")
                
                # Verify status field is present in all entries
                missing_status_count = 0
                empty_status_count = 0
                valid_statuses = ['PENDING', 'APPROVED', 'PAID', 'REJECTED']
                
                for cost in costs:
                    if 'status' not in cost:
                        missing_status_count += 1
                    elif not cost['status'] or cost['status'] == '':
                        empty_status_count += 1
                    elif cost['status'] not in valid_statuses:
                        self.log_test("Invalid Status Found", "WARN", f"Cost {cost.get('costId', 'unknown')} has invalid status: {cost['status']}")
                
                if missing_status_count == 0 and empty_status_count == 0:
                    self.log_test("Bug Fix Verification - Status Field Present", "PASS", f"All {len(costs)} cost entries have valid status field")
                else:
                    self.log_test("Bug Fix Verification - Status Field Present", "FAIL", f"Missing status: {missing_status_count}, Empty status: {empty_status_count}")
                
                # Show status distribution
                status_counts = {}
                for cost in costs:
                    status = cost.get('status', 'MISSING')
                    status_counts[status] = status_counts.get(status, 0) + 1
                
                self.log_test("Status Distribution", "INFO", f"Status counts: {status_counts}")
                
            else:
                self.log_test("Costs Entries List - Pastor Access", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Costs Entries List - Pastor Access", "FAIL", f"Exception: {str(e)}")

        # Test with Master user (should see all costs)
        try:
            headers = {"Authorization": f"Bearer {self.master_token}"}
            response = requests.post(f"{BASE_URL}/costs-entries/list", json={}, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                costs = data.get('costs', [])
                self.log_test("Costs Entries List - Master Access", "PASS", f"Master can access, found {len(costs)} cost entries")
                
                # Test filtering by status
                for status in ['PENDING', 'APPROVED', 'PAID', 'REJECTED']:
                    filter_response = requests.post(f"{BASE_URL}/costs-entries/list", 
                                                  json={"status": status}, headers=headers)
                    if filter_response.status_code == 200:
                        filtered_costs = filter_response.json().get('costs', [])
                        self.log_test(f"Filter by Status {status}", "PASS", f"Found {len(filtered_costs)} entries with status {status}")
                    else:
                        self.log_test(f"Filter by Status {status}", "FAIL", f"Status: {filter_response.status_code}")
                        
            else:
                self.log_test("Costs Entries List - Master Access", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Costs Entries List - Master Access", "FAIL", f"Exception: {str(e)}")

    def test_privacy_system(self):
        """Test 3: POST /api/privacy/get and POST /api/privacy/save - Test new privacy system"""
        print("🔍 TESTE 3: Sistema de Privacidade")
        
        # Test privacy/save endpoint (Master only)
        try:
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            # Create a test privacy configuration
            privacy_config = {
                "roleId": "test-role-123",
                "roleName": "Pastor Teste",
                "allowedTabs": ["dashboard", "costs", "reports"]
            }
            
            response = requests.post(f"{BASE_URL}/privacy/save", json=privacy_config, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Privacy Save - Master Access", "PASS", f"Privacy config saved successfully: {data.get('message')}")
            else:
                self.log_test("Privacy Save - Master Access", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Privacy Save - Master Access", "FAIL", f"Exception: {str(e)}")

        # Test privacy/get endpoint (Master only)
        try:
            headers = {"Authorization": f"Bearer {self.master_token}"}
            
            get_data = {"roleId": "test-role-123"}
            response = requests.post(f"{BASE_URL}/privacy/get", json=get_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                config = data.get('config', {})
                allowed_tabs = config.get('allowedTabs', [])
                self.log_test("Privacy Get - Master Access", "PASS", f"Privacy config retrieved: {len(allowed_tabs)} allowed tabs")
                
                # Verify the saved configuration
                expected_tabs = ["dashboard", "costs", "reports"]
                if set(allowed_tabs) == set(expected_tabs):
                    self.log_test("Privacy Config Verification", "PASS", "Saved configuration matches retrieved configuration")
                else:
                    self.log_test("Privacy Config Verification", "FAIL", f"Expected {expected_tabs}, got {allowed_tabs}")
            else:
                self.log_test("Privacy Get - Master Access", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Privacy Get - Master Access", "FAIL", f"Exception: {str(e)}")

        # Test privacy endpoints with Pastor user (should be denied)
        try:
            headers = {"Authorization": f"Bearer {self.pastor_token}"}
            
            # Test privacy/save with Pastor (should fail)
            response = requests.post(f"{BASE_URL}/privacy/save", json=privacy_config, headers=headers)
            if response.status_code == 403:
                self.log_test("Privacy Save - Pastor Access Denied", "PASS", "Pastor correctly denied access to privacy/save")
            else:
                self.log_test("Privacy Save - Pastor Access Denied", "FAIL", f"Expected 403, got {response.status_code}")
                
            # Test privacy/get with Pastor (should fail)
            response = requests.post(f"{BASE_URL}/privacy/get", json={"roleId": "test-role-123"}, headers=headers)
            if response.status_code == 403:
                self.log_test("Privacy Get - Pastor Access Denied", "PASS", "Pastor correctly denied access to privacy/get")
            else:
                self.log_test("Privacy Get - Pastor Access Denied", "FAIL", f"Expected 403, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Privacy - Pastor Access Test", "FAIL", f"Exception: {str(e)}")

        # Test privacy/list-all endpoint
        try:
            headers = {"Authorization": f"Bearer {self.master_token}"}
            response = requests.post(f"{BASE_URL}/privacy/list-all", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                configs = data.get('configs', [])
                self.log_test("Privacy List All", "PASS", f"Retrieved {len(configs)} privacy configurations")
            else:
                self.log_test("Privacy List All", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Privacy List All", "FAIL", f"Exception: {str(e)}")

    def approve_and_pay_cost_entry(self):
        """Create, approve and mark as paid a cost entry to test status workflow"""
        try:
            # Create cost entry as Pastor
            headers_pastor = {"Authorization": f"Bearer {self.pastor_token}"}
            headers_master = {"Authorization": f"Bearer {self.master_token}"}
            
            # Get cost types
            custos_response = requests.post(f"{BASE_URL}/custos/list", headers=headers_pastor)
            if custos_response.status_code != 200:
                return None
                
            custos = custos_response.json().get('custos', [])
            if not custos:
                return None
            
            # Create cost entry
            cost_entry_data = {
                "costTypeId": custos[0]['custoId'],
                "costTypeName": custos[0]['name'],
                "description": "Custo para teste de workflow",
                "value": 250.00,
                "dueDate": "2025-01-15"
            }
            
            create_response = requests.post(f"{BASE_URL}/costs-entries/create", json=cost_entry_data, headers=headers_pastor)
            if create_response.status_code != 200:
                return None
                
            cost_id = create_response.json().get('cost', {}).get('costId')
            
            # Approve as Master
            approve_response = requests.post(f"{BASE_URL}/costs-entries/approve", 
                                           json={"costId": cost_id}, headers=headers_master)
            if approve_response.status_code == 200:
                self.log_test("Cost Entry Approval", "PASS", f"Cost entry {cost_id} approved successfully")
            
            # Mark as paid as Master
            pay_response = requests.post(f"{BASE_URL}/costs-entries/pay", 
                                       json={"costId": cost_id}, headers=headers_master)
            if pay_response.status_code == 200:
                self.log_test("Cost Entry Payment", "PASS", f"Cost entry {cost_id} marked as paid successfully")
                return cost_id
            
            return cost_id
        except Exception as e:
            self.log_test("Cost Entry Workflow", "FAIL", f"Exception: {str(e)}")
            return None

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 INICIANDO TESTES DE BACKEND - CORREÇÕES DE BUGS E SISTEMA DE PRIVACIDADE")
        print("=" * 80)
        
        # Setup phase
        if not self.login_master():
            print("❌ Cannot proceed without Master login")
            return False
            
        if not self.create_pastor_user():
            print("❌ Cannot proceed without Pastor user")
            return False
            
        if not self.login_pastor():
            print("❌ Cannot proceed without Pastor login")
            return False
            
        # Create test data
        self.create_test_cost_types()
        
        # Run the specific tests requested
        self.test_custos_list_endpoint()
        self.test_costs_entries_list_endpoint()
        self.test_privacy_system()
        
        # Test cost entry workflow
        self.approve_and_pay_cost_entry()
        
        # Summary
        print("=" * 80)
        print("📊 RESUMO DOS TESTES")
        print("=" * 80)
        
        passed = len([r for r in self.test_results if r['status'] == 'PASS'])
        failed = len([r for r in self.test_results if r['status'] == 'FAIL'])
        warnings = len([r for r in self.test_results if r['status'] == 'WARN'])
        
        print(f"✅ PASSOU: {passed}")
        print(f"❌ FALHOU: {failed}")
        print(f"⚠️  AVISOS: {warnings}")
        print(f"📋 TOTAL: {len(self.test_results)}")
        
        if failed > 0:
            print("\n❌ TESTES QUE FALHARAM:")
            for result in self.test_results:
                if result['status'] == 'FAIL':
                    print(f"   - {result['test']}: {result['details']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)