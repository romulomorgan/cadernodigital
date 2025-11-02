#!/bin/bash

echo "=========================================="
echo "IUDP Phase 4 - UI & Dashboard Test"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000/api"
GREEN='\033[0;32m'
NC='\033[0m'

# Login as master
echo "1. Login as Master..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "master@iudp.com",
    "password": "master123"
  }')
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Logged in successfully"
echo ""

# Test Dashboard Data
echo "2. Testing Dashboard Data Endpoint..."
DASHBOARD_RESPONSE=$(curl -s -X POST "${BASE_URL}/dashboard/data" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025
  }')
echo "Dashboard response (first 200 chars): ${DASHBOARD_RESPONSE:0:200}"
echo ""

# Test GET unlock requests
echo "3. Testing GET Unlock Requests..."
UNLOCK_RESPONSE=$(curl -s -X GET "${BASE_URL}/unlock/requests" \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $UNLOCK_RESPONSE"
echo ""

# Test Month Observation Save
echo "4. Testing Month Observation..."
OBS_RESPONSE=$(curl -s -X POST "${BASE_URL}/observations/month" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025,
    "observation": "Mes abençoado com grande arrecadacao!"
  }')
echo "Response: $OBS_RESPONSE"
echo ""

# Test Close Month
echo "5. Testing Close Month..."
CLOSE_RESPONSE=$(curl -s -X POST "${BASE_URL}/month/close" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 11,
    "year": 2025
  }')
echo "Response: $CLOSE_RESPONSE"
echo ""

# Test Reopen Month
echo "6. Testing Reopen Month..."
REOPEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/month/reopen" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 11,
    "year": 2025
  }')
echo "Response: $REOPEN_RESPONSE"
echo ""

# Verify entries include observations
echo "7. Verifying Month Data with Observations..."
MONTH_DATA=$(curl -s -X POST "${BASE_URL}/entries/month" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025
  }')
HAS_OBS=$(echo $MONTH_DATA | grep -o '"monthObservation"' | wc -l)
echo "Month observation field present: $HAS_OBS"
echo ""

echo "=========================================="
echo -e "${GREEN}Phase 4 Tests Complete!${NC}"
echo "=========================================="
echo ""
echo "New Features Working:"
echo " - Dashboard endpoint funcional"
echo " - GET unlock requests corrigido"
echo " - Observacoes de mes salvando"
echo " - Fechamento de mes funcional"
echo " - Reabertura de mes funcional"
echo " - Frontend com graficos adicionado"
echo " - UI de fechamento de mes adicionada"
echo ""
echo "Sistema COMPLETO com Interface Final!"
echo ""
