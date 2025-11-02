#!/bin/bash

echo "=========================================="
echo "IUDP System Test - Brazil Timezone"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:3000/api"

echo "1. Testing Brazil Time Endpoint..."
TIME_RESPONSE=$(curl -s "${BASE_URL}/time/current")
echo "Response: $TIME_RESPONSE"
echo ""

echo "2. Registering Master User..."
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pastor João Silva",
    "email": "master@iudp.com",
    "password": "master123",
    "role": "master",
    "church": "Igreja Central",
    "region": "Centro",
    "state": "SP"
  }')
echo "Response: $REGISTER_RESPONSE"
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token extracted: ${TOKEN:0:50}..."
echo ""

echo "3. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "master@iudp.com",
    "password": "master123"
  }')
echo "Response: $LOGIN_RESPONSE"
echo ""

echo "4. Creating Entry for Today 08:00..."
ENTRY_RESPONSE=$(curl -s -X POST "${BASE_URL}/entries/save" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025,
    "day": 15,
    "timeSlot": "08:00",
    "value": 150.50,
    "notes": "Oferta culto matinal"
  }')
echo "Response: $ENTRY_RESPONSE"
echo ""

echo "5. Creating Entry for 10:00..."
ENTRY2_RESPONSE=$(curl -s -X POST "${BASE_URL}/entries/save" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025,
    "day": 15,
    "timeSlot": "10:00",
    "value": 275.00,
    "notes": "Culto principal"
  }')
echo "Response: $ENTRY2_RESPONSE"
echo ""

echo "6. Fetching January 2025 Entries..."
MONTH_RESPONSE=$(curl -s -X POST "${BASE_URL}/entries/month" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025
  }')
echo "Response: $MONTH_RESPONSE"
echo ""

echo "7. Registering Pastor User..."
PASTOR_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pastor Maria Santos",
    "email": "pastor@iudp.com",
    "password": "pastor123",
    "role": "pastor",
    "church": "Igreja Zona Sul",
    "region": "Sul",
    "state": "SP"
  }')
echo "Response: $PASTOR_RESPONSE"
echo ""

echo "=========================================="
echo -e "${GREEN}✓ Test Complete!${NC}"
echo "=========================================="
echo ""
echo "Now open your browser to test:"
echo "1. Login with master@iudp.com / master123"
echo "2. Try creating entries in the calendar"
echo "3. Test the time-based locking system"
echo ""
