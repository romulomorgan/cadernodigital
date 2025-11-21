#!/usr/bin/env python3
"""
Backend Test - Photo URLs for Churches and Users
Testing and fixing photo URL issues where URLs should start with /api/uploads/ not /uploads/
"""

import requests
import json
import os
from datetime import datetime

# Configuration
BASE_URL = "https://iudp-control.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Test credentials
MASTER_EMAIL = "joao.silva@iudp.org.br"
MASTER_PASSWORD = "LiderMaximo2025!"

def login_master():
    """Login as master user and return token"""
    print("🔐 Logging in as Master user...")
    
    response = requests.post(f"{API_URL}/auth/login", json={
        "email": MASTER_EMAIL,
        "password": MASTER_PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        print(f"✅ Master login successful")
        return token
    else:
        print(f"❌ Master login failed: {response.status_code} - {response.text}")
        return None

def test_photo_serving_endpoint():
    """Test 1: Verify GET /api/uploads/churches/[filename] endpoint"""
    print("\n🎯 TEST 1: Testing photo serving endpoint")
    
    # Test with a non-existent file first to check endpoint exists
    test_url = f"{API_URL}/uploads/churches/test-file.jpg"
    
    try:
        response = requests.get(test_url)
        print(f"📡 GET {test_url}")
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 404:
            print("✅ Endpoint exists and correctly returns 404 for non-existent file")
            return True
        elif response.status_code == 500:
            print("❌ Endpoint has server error - likely fs import issue")
            return False
        else:
            print(f"⚠️ Unexpected status code: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")
        return False

def check_database_urls(token):
    """Test 2: Check current URLs in database"""
    print("\n🎯 TEST 2: Checking current URLs in database")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check churches
    print("🏛️ Checking church URLs...")
    response = requests.post(f"{API_URL}/churches/list", headers=headers)
    
    if response.status_code == 200:
        churches = response.json().get('churches', [])
        print(f"📊 Found {len(churches)} churches")
        
        incorrect_urls = []
        for church in churches:
            if church.get('photoUrl') and church['photoUrl'].startswith('/uploads/'):
                incorrect_urls.append({
                    'type': 'church',
                    'id': church['churchId'],
                    'name': church['name'],
                    'currentUrl': church['photoUrl'],
                    'correctUrl': church['photoUrl'].replace('/uploads/', '/api/uploads/')
                })
                print(f"❌ Church '{church['name']}': {church['photoUrl']} (INCORRECT)")
            elif church.get('photoUrl'):
                print(f"✅ Church '{church['name']}': {church['photoUrl']} (CORRECT)")
        
        return incorrect_urls
    else:
        print(f"❌ Failed to get churches: {response.status_code}")
        return []

def fix_database_urls(token, incorrect_urls):
    """Test 3: Fix incorrect URLs in database"""
    print("\n🎯 TEST 3: Fixing incorrect URLs in database")
    
    if not incorrect_urls:
        print("✅ No URLs need fixing")
        return True
    
    headers = {"Authorization": f"Bearer {token}"}
    fixed_count = 0
    
    for item in incorrect_urls:
        if item['type'] == 'church':
            print(f"🔧 Fixing church '{item['name']}'...")
            print(f"   From: {item['currentUrl']}")
            print(f"   To:   {item['correctUrl']}")
            
            # Update church with correct URL
            response = requests.post(f"{API_URL}/churches/update", 
                headers=headers,
                json={
                    "churchId": item['id'],
                    "churchData": {
                        "photoUrl": item['correctUrl']
                    }
                }
            )
            
            if response.status_code == 200:
                print(f"✅ Fixed church '{item['name']}'")
                fixed_count += 1
            else:
                print(f"❌ Failed to fix church '{item['name']}': {response.status_code}")
    
    print(f"📊 Fixed {fixed_count}/{len(incorrect_urls)} URLs")
    return fixed_count == len(incorrect_urls)

def test_new_church_photo_url(token):
    """Test 4: Create new church and verify URL is correct"""
    print("\n🎯 TEST 4: Testing new church photo URL")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a test church
    church_name = f"Test Church Photo URL {datetime.now().strftime('%H%M%S')}"
    
    print(f"🏛️ Creating test church: {church_name}")
    response = requests.post(f"{API_URL}/churches/create", 
        headers=headers,
        json={
            "name": church_name,
            "address": "Test Address",
            "city": "Test City",
            "state": "SP"
        }
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to create test church: {response.status_code}")
        return False
    
    church_data = response.json()
    church_id = church_data['church']['churchId']
    print(f"✅ Created church with ID: {church_id}")
    
    # Create a simple test image (1x1 pixel PNG)
    # This is a minimal valid PNG file in base64
    test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
    
    # Upload photo
    print("📸 Uploading test photo...")
    files = {
        'photo': ('test.png', test_image_data, 'image/png')
    }
    data = {
        'churchId': church_id
    }
    
    response = requests.post(f"{API_URL}/churches/upload-photo", 
        headers=headers,
        files=files,
        data=data
    )
    
    if response.status_code == 200:
        upload_result = response.json()
        photo_url = upload_result.get('photoUrl')
        print(f"✅ Photo uploaded successfully")
        print(f"📊 Photo URL: {photo_url}")
        
        # Verify URL starts with /api/uploads/
        if photo_url and photo_url.startswith('/api/uploads/churches/'):
            print("✅ Photo URL is CORRECT (starts with /api/uploads/churches/)")
            
            # Test if the photo can be accessed
            full_url = f"{BASE_URL}{photo_url}"
            print(f"🌐 Testing photo access: {full_url}")
            
            photo_response = requests.get(full_url)
            if photo_response.status_code == 200:
                content_type = photo_response.headers.get('content-type', '')
                if content_type.startswith('image/'):
                    print(f"✅ Photo accessible with correct Content-Type: {content_type}")
                    return True
                else:
                    print(f"❌ Photo accessible but wrong Content-Type: {content_type}")
                    return False
            else:
                print(f"❌ Photo not accessible: {photo_response.status_code}")
                return False
        else:
            print(f"❌ Photo URL is INCORRECT: {photo_url}")
            return False
    else:
        print(f"❌ Photo upload failed: {response.status_code} - {response.text}")
        return False

def validate_final_state(token):
    """Test 5: Final validation - list churches and verify all URLs are correct"""
    print("\n🎯 TEST 5: Final validation of all church URLs")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(f"{API_URL}/churches/list", headers=headers)
    
    if response.status_code == 200:
        churches = response.json().get('churches', [])
        print(f"📊 Validating {len(churches)} churches")
        
        all_correct = True
        for church in churches:
            if church.get('photoUrl'):
                if church['photoUrl'].startswith('/api/uploads/churches/'):
                    print(f"✅ {church['name']}: {church['photoUrl']}")
                else:
                    print(f"❌ {church['name']}: {church['photoUrl']} (STILL INCORRECT)")
                    all_correct = False
            else:
                print(f"ℹ️ {church['name']}: No photo")
        
        return all_correct
    else:
        print(f"❌ Failed to get churches for validation: {response.status_code}")
        return False

def main():
    """Main test execution"""
    print("🚀 STARTING PHOTO URL TESTS FOR CHURCHES")
    print("=" * 60)
    
    # Login
    token = login_master()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    # Test results
    results = []
    
    # Test 1: Photo serving endpoint
    results.append(("Photo serving endpoint", test_photo_serving_endpoint()))
    
    # Test 2: Check database URLs
    incorrect_urls = check_database_urls(token)
    results.append(("Database URL check", True))  # Always passes, just collects data
    
    # Test 3: Fix incorrect URLs
    if incorrect_urls:
        results.append(("Fix database URLs", fix_database_urls(token, incorrect_urls)))
    else:
        results.append(("Fix database URLs", True))  # No URLs to fix
    
    # Test 4: Test new church photo URL
    results.append(("New church photo URL", test_new_church_photo_url(token)))
    
    # Test 5: Final validation
    results.append(("Final validation", validate_final_state(token)))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n📈 OVERALL RESULT: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED - Photo URLs are working correctly!")
    else:
        print("⚠️ Some tests failed - Photo URL issues need attention")

if __name__ == "__main__":
    main()