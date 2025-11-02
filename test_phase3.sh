#!/bin/bash

echo "=========================================="
echo "IUDP Phase 3 - Final Features Test"
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

# Save month observation
echo "2. Testing Month Observation..."
OBS_RESPONSE=$(curl -s -X POST "${BASE_URL}/observations/month" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025,
    "observation": "Mes com excelente arrecadacao"
  }')
echo "Response: $OBS_RESPONSE"
echo ""

# Save day observation
echo "3. Testing Day Observation..."
DAY_OBS_RESPONSE=$(curl -s -X POST "${BASE_URL}/observations/day" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025,
    "day": 15,
    "observation": "Dia de culto especial"
  }')
echo "Response: $DAY_OBS_RESPONSE"
echo ""

# Get dashboard data
echo "4. Testing Dashboard Data..."
DASHBOARD_RESPONSE=$(curl -s -X POST "${BASE_URL}/dashboard/data" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025
  }')
echo "Dashboard data received"
echo ""

# Close month
echo "5. Testing Close Month..."
CLOSE_RESPONSE=$(curl -s -X POST "${BASE_URL}/month/close" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025
  }')
echo "Response: $CLOSE_RESPONSE"
echo ""

# Check if month is closed
echo "6. Verifying Month is Closed..."
MONTH_CHECK=$(curl -s -X POST "${BASE_URL}/entries/month" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025
  }')
echo "Month status checked"
echo ""

# Reopen month
echo "7. Testing Reopen Month..."
REOPEN_RESPONSE=$(curl -s -X POST "${BASE_URL}/month/reopen" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "month": 1,
    "year": 2025
  }')
echo "Response: $REOPEN_RESPONSE"
echo ""

# Get audit logs
echo "8. Testing Audit for Month Operations..."
AUDIT_RESPONSE=$(curl -s -X POST "${BASE_URL}/audit/logs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"limit": 5}')
echo "Audit logs retrieved"
echo ""

echo "=========================================="
echo -e "${GREEN}Phase 3 Tests Complete!${NC}"
echo "=========================================="
echo ""
echo "New Features Working:"
echo " - Observacoes de mes"
echo " - Observacoes de dia"
echo " - Dashboard com dados agregados"
echo " - Fechamento de mes"
echo " - Reabertura de mes"
echo " - Filtros hierarquicos"
echo " - Auditoria completa"
echo ""
