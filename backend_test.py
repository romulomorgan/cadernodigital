#!/usr/bin/env python3
"""
Backend Test Suite - Sistema de Solicitações e Upload de Custos
Testa os endpoints críticos implementados recentemente
"""

import requests
import json
import base64
import os
import tempfile
from datetime import datetime, timedelta

# Configuração da API
BASE_URL = "https://iudp-control.preview.emergentagent.com/api"

# Credenciais de teste
MASTER_EMAIL = "joao.silva@iudp.org.br"
MASTER_PASSWORD = "LiderMaximo2025!"

class FinancialCalculationTester:
    def __init__(self):
        self.token = None
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
    
    def login_master(self):
        """Login as Master user"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=MASTER_CREDENTIALS)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('token')
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                
                user_info = data.get('user', {})
                self.log_test("Master Login", True, f"Logged in as {user_info.get('name', 'Unknown')} ({user_info.get('role', 'Unknown')})")
                return True
            else:
                self.log_test("Master Login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Master Login", False, f"Exception: {str(e)}")
            return False
    
    def get_churches_list(self):
        """Get list of available churches"""
        try:
            response = self.session.post(f"{BASE_URL}/churches/list", json={})
            
            if response.status_code == 200:
                data = response.json()
                churches = data.get('churches', [])
                self.log_test("Get Churches List", True, f"Found {len(churches)} churches")
                
                # Print church details for reference
                print("\n📋 AVAILABLE CHURCHES:")
                for church in churches:
                    print(f"   - {church.get('name', 'Unknown')} (ID: {church.get('churchId', 'N/A')})")
                
                return churches
            else:
                self.log_test("Get Churches List", False, f"Status: {response.status_code}")
                return []
                
        except Exception as e:
            self.log_test("Get Churches List", False, f"Exception: {str(e)}")
            return []
    
    def test_aggregation_without_filter(self):
        """Test 1: Aggregation WITHOUT church filter - should aggregate by day+timeSlot"""
        try:
            # Request entries for November 2025 without church filter
            payload = {
                "month": 11,
                "year": 2025
                # No churchFilter - should aggregate
            }
            
            response = self.session.post(f"{BASE_URL}/entries/month", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                entries = data.get('entries', [])
                
                print(f"\n🔍 TEST 1 - AGGREGATION WITHOUT FILTER:")
                print(f"   Total entries returned: {len(entries)}")
                
                # Validate aggregation structure
                aggregated_entries = 0
                total_value_sum = 0
                
                for entry in entries:
                    # Check if entry has aggregation fields
                    has_value = 'value' in entry and entry['value'] is not None
                    has_total_value = 'totalValue' in entry
                    has_churches = 'churches' in entry and isinstance(entry['churches'], list)
                    has_church_count = 'churchCount' in entry
                    
                    if has_value:
                        total_value_sum += entry['value']
                        
                        print(f"   Entry {entry.get('day', 'N/A')}-{entry.get('timeSlot', 'N/A')}:")
                        print(f"     - Value: R$ {entry['value']:.2f}")
                        if has_total_value:
                            print(f"     - TotalValue: R$ {entry.get('totalValue', 0):.2f}")
                        if has_churches:
                            print(f"     - Churches: {len(entry['churches'])} churches aggregated")
                            for church in entry['churches']:
                                print(f"       * {church.get('churchName', 'Unknown')}: R$ {church.get('value', 0):.2f}")
                        if has_church_count:
                            print(f"     - ChurchCount: {entry['churchCount']}")
                        
                        aggregated_entries += 1
                
                # Validation checks
                all_have_value = all('value' in entry for entry in entries)
                all_have_churches = all('churches' in entry for entry in entries if entry.get('value', 0) > 0)
                
                success = len(entries) > 0 and all_have_value
                details = f"Entries: {len(entries)}, Total Value: R$ {total_value_sum:.2f}, All have 'value' field: {all_have_value}"
                
                self.log_test("Aggregation Without Filter", success, details)
                
                return {
                    "entries_count": len(entries),
                    "total_value": total_value_sum,
                    "aggregated_entries": aggregated_entries,
                    "entries": entries
                }
            else:
                self.log_test("Aggregation Without Filter", False, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Aggregation Without Filter", False, f"Exception: {str(e)}")
            return None
    
    def test_aggregation_with_filter(self, churches):
        """Test 2: Aggregation WITH church filter - should return only entries from that church"""
        if not churches:
            self.log_test("Aggregation With Filter", False, "No churches available for testing")
            return None
            
        try:
            # Use the first church for testing
            test_church = churches[0]
            church_id = test_church.get('churchId')
            church_name = test_church.get('name', 'Unknown')
            
            # Request entries for November 2025 WITH church filter
            payload = {
                "month": 11,
                "year": 2025,
                "churchFilter": church_id
            }
            
            response = self.session.post(f"{BASE_URL}/entries/month", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                entries = data.get('entries', [])
                
                print(f"\n🔍 TEST 2 - AGGREGATION WITH FILTER:")
                print(f"   Church Filter: {church_name} (ID: {church_id})")
                print(f"   Total entries returned: {len(entries)}")
                
                # Validate that all entries belong to the filtered church
                all_from_church = True
                total_value_sum = 0
                
                for entry in entries:
                    entry_church_id = entry.get('churchId')
                    entry_value = entry.get('value', 0)
                    total_value_sum += entry_value
                    
                    print(f"   Entry {entry.get('day', 'N/A')}-{entry.get('timeSlot', 'N/A')}:")
                    print(f"     - ChurchId: {entry_church_id}")
                    print(f"     - Church: {entry.get('church', 'Unknown')}")
                    print(f"     - Value: R$ {entry_value:.2f}")
                    print(f"     - Has 'churches' array: {'churches' in entry}")
                    
                    if entry_church_id != church_id:
                        all_from_church = False
                        print(f"     ❌ WRONG CHURCH! Expected: {church_id}, Got: {entry_church_id}")
                
                # Check if entries are NOT aggregated (should be individual entries)
                has_aggregation = any('churches' in entry and len(entry.get('churches', [])) > 1 for entry in entries)
                
                success = all_from_church and not has_aggregation
                details = f"Entries: {len(entries)}, All from church: {all_from_church}, Not aggregated: {not has_aggregation}, Total: R$ {total_value_sum:.2f}"
                
                self.log_test("Aggregation With Filter", success, details)
                
                return {
                    "entries_count": len(entries),
                    "total_value": total_value_sum,
                    "all_from_church": all_from_church,
                    "church_name": church_name,
                    "entries": entries
                }
            else:
                self.log_test("Aggregation With Filter", False, f"Status: {response.status_code}")
                return None
                
        except Exception as e:
            self.log_test("Aggregation With Filter", False, f"Exception: {str(e)}")
            return None
    
    def test_total_calculations(self, without_filter_result, with_filter_result):
        """Test 3: Validate total calculations"""
        try:
            print(f"\n🔍 TEST 3 - TOTAL CALCULATIONS:")
            
            if not without_filter_result:
                self.log_test("Total Calculations", False, "No data from aggregation without filter test")
                return
            
            without_filter_total = without_filter_result.get('total_value', 0)
            without_filter_count = without_filter_result.get('entries_count', 0)
            
            print(f"   Without Filter - Total: R$ {without_filter_total:.2f}, Entries: {without_filter_count}")
            
            if with_filter_result:
                with_filter_total = with_filter_result.get('total_value', 0)
                with_filter_count = with_filter_result.get('entries_count', 0)
                church_name = with_filter_result.get('church_name', 'Unknown')
                
                print(f"   With Filter ({church_name}) - Total: R$ {with_filter_total:.2f}, Entries: {with_filter_count}")
                
                # Validate that filtered total is less than or equal to total without filter
                logical_totals = with_filter_total <= without_filter_total
                
                success = without_filter_total >= 0 and with_filter_total >= 0 and logical_totals
                details = f"Without filter: R$ {without_filter_total:.2f}, With filter: R$ {with_filter_total:.2f}, Logical: {logical_totals}"
            else:
                success = without_filter_total >= 0
                details = f"Without filter: R$ {without_filter_total:.2f} (no filter test data available)"
            
            self.log_test("Total Calculations", success, details)
            
        except Exception as e:
            self.log_test("Total Calculations", False, f"Exception: {str(e)}")
    
    def test_aggregation_key_validation(self, without_filter_result):
        """Test 4: Validate aggregation is using day+timeSlot key (not entryId)"""
        try:
            print(f"\n🔍 TEST 4 - AGGREGATION KEY VALIDATION:")
            
            if not without_filter_result:
                self.log_test("Aggregation Key Validation", False, "No data from aggregation test")
                return
            
            entries = without_filter_result.get('entries', [])
            
            # Check for entries that should be aggregated (same day+timeSlot)
            day_timeslot_map = {}
            
            for entry in entries:
                day = entry.get('day')
                timeslot = entry.get('timeSlot')
                key = f"{day}-{timeslot}"
                
                if key not in day_timeslot_map:
                    day_timeslot_map[key] = []
                day_timeslot_map[key].append(entry)
            
            # Look for evidence of proper aggregation
            aggregated_slots = 0
            total_churches_aggregated = 0
            
            for key, entries_list in day_timeslot_map.items():
                if len(entries_list) == 1:  # Should be 1 entry per day+timeslot (aggregated)
                    entry = entries_list[0]
                    churches = entry.get('churches', [])
                    church_count = entry.get('churchCount', 0)
                    
                    if len(churches) > 1 or church_count > 1:
                        aggregated_slots += 1
                        total_churches_aggregated += len(churches)
                        print(f"   Slot {key}: {len(churches)} churches aggregated")
                        for church in churches:
                            print(f"     - {church.get('churchName', 'Unknown')}: R$ {church.get('value', 0):.2f}")
            
            success = aggregated_slots > 0 or len(day_timeslot_map) == len(entries)
            details = f"Unique day+timeslot combinations: {len(day_timeslot_map)}, Aggregated slots: {aggregated_slots}, Total churches: {total_churches_aggregated}"
            
            self.log_test("Aggregation Key Validation", success, details)
            
        except Exception as e:
            self.log_test("Aggregation Key Validation", False, f"Exception: {str(e)}")
    
    def test_value_field_consistency(self, without_filter_result):
        """Test 5: Validate that aggregated entries have 'value' field equal to 'totalValue'"""
        try:
            print(f"\n🔍 TEST 5 - VALUE FIELD CONSISTENCY:")
            
            if not without_filter_result:
                self.log_test("Value Field Consistency", False, "No data from aggregation test")
                return
            
            entries = without_filter_result.get('entries', [])
            
            consistent_entries = 0
            inconsistent_entries = 0
            
            for entry in entries:
                value = entry.get('value', 0)
                total_value = entry.get('totalValue', 0)
                
                if 'totalValue' in entry:
                    if abs(value - total_value) < 0.01:  # Allow for floating point precision
                        consistent_entries += 1
                    else:
                        inconsistent_entries += 1
                        print(f"   ❌ Inconsistent entry {entry.get('day')}-{entry.get('timeSlot')}: value={value}, totalValue={total_value}")
                else:
                    # If no totalValue field, just check that value exists
                    if value is not None:
                        consistent_entries += 1
            
            success = inconsistent_entries == 0 and consistent_entries > 0
            details = f"Consistent entries: {consistent_entries}, Inconsistent: {inconsistent_entries}"
            
            self.log_test("Value Field Consistency", success, details)
            
        except Exception as e:
            self.log_test("Value Field Consistency", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all financial calculation tests"""
        print("🧪 STARTING FINANCIAL CALCULATION VALIDATION TESTS")
        print("=" * 60)
        
        # Step 1: Login as Master
        if not self.login_master():
            print("❌ Cannot proceed without Master login")
            return False
        
        # Step 2: Get churches list
        churches = self.get_churches_list()
        
        # Step 3: Test aggregation without filter
        without_filter_result = self.test_aggregation_without_filter()
        
        # Step 4: Test aggregation with filter
        with_filter_result = self.test_aggregation_with_filter(churches)
        
        # Step 5: Test total calculations
        self.test_total_calculations(without_filter_result, with_filter_result)
        
        # Step 6: Test aggregation key validation
        self.test_aggregation_key_validation(without_filter_result)
        
        # Step 7: Test value field consistency
        self.test_value_field_consistency(without_filter_result)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY:")
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
        
        print(f"\n🎯 OVERALL RESULT: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - Financial calculations are working correctly!")
            return True
        else:
            print("⚠️  SOME TESTS FAILED - Issues found in financial calculations")
            return False

def main():
    """Main test execution"""
    tester = FinancialCalculationTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()