#!/bin/bash

# API Testing Script for NR Permitting API
# This script demonstrates how to test the API endpoints

echo "🧪 Testing NR Permitting API Endpoints"
echo "======================================="

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
SUBSCRIPTION_KEY="${SUBSCRIPTION_KEY:-test-key-123}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    
    echo -e "\n${YELLOW}Testing: $method $endpoint${NC}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X $method \
            -H "Content-Type: application/json" \
            -H "Ocp-Apim-Subscription-Key: $SUBSCRIPTION_KEY" \
            -d "$data" \
            "$API_BASE_URL$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -X $method \
            -H "Ocp-Apim-Subscription-Key: $SUBSCRIPTION_KEY" \
            "$API_BASE_URL$endpoint")
    fi
    
    # Extract body and status
    body=$(echo $response | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    status=$(echo $response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    # Check status
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ Status: $status (Expected: $expected_status)${NC}"
    else
        echo -e "${RED}❌ Status: $status (Expected: $expected_status)${NC}"
    fi
    
    # Pretty print JSON response
    if command -v jq &> /dev/null; then
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        echo "$body"
    fi
    
    return $status
}

# Test 1: Root endpoint
echo -e "\n${YELLOW}=== Test 1: Root Endpoint ===${NC}"
test_endpoint "GET" "/" "" "200"

# Test 2: Health check
echo -e "\n${YELLOW}=== Test 2: Health Check ===${NC}"
test_endpoint "GET" "/health" "" "200"

# Test 3: API Documentation
echo -e "\n${YELLOW}=== Test 3: API Documentation ===${NC}"
echo "📚 API Documentation available at: $API_BASE_URL/api-docs"
echo "📋 OpenAPI Specification: $API_BASE_URL/openapi.json"

# Test 4: Create a record (will fail without database, but shows structure)
echo -e "\n${YELLOW}=== Test 4: Create Record (Demo) ===${NC}"
record_data='{
  "version": "1.0.0",
  "kind": "ProcessEventSet",
  "system_id": "test-system",
  "record_id": "TEST-001",
  "record_kind": "Permit",
  "process_event": {
    "event_type": "application_submitted",
    "timestamp": "2024-01-15T10:30:00Z",
    "applicant_id": "APP-12345",
    "permit_type": "timber_harvest",
    "location": {
      "latitude": 54.7267,
      "longitude": -127.7476
    },
    "area_hectares": 150.5,
    "estimated_volume_m3": 2500
  }
}'

echo "📝 Sample record data:"
if command -v jq &> /dev/null; then
    echo "$record_data" | jq .
else
    echo "$record_data"
fi

test_endpoint "POST" "/api/v1/records" "$record_data" "503"  # Expected to fail without DB

# Test 5: Get record (demo)
echo -e "\n${YELLOW}=== Test 5: Get Record (Demo) ===${NC}"
test_endpoint "GET" "/api/v1/records/123e4567-e89b-12d3-a456-426614174000" "" "503"  # Expected to fail without DB

# Test 6: Invalid endpoint
echo -e "\n${YELLOW}=== Test 6: Invalid Endpoint ===${NC}"
test_endpoint "GET" "/api/v1/invalid" "" "404"

echo -e "\n${GREEN}🎉 API Testing Complete!${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. 🗄️  Set up Azure PostgreSQL database"
echo "2. 🔐 Configure Azure Key Vault with database credentials"
echo "3. 🚀 Deploy to Azure Container Apps"
echo "4. 🌐 Import OpenAPI spec to Azure API Management"
echo "5. 🔑 Configure subscription keys and authentication"
echo ""
echo "📖 For full deployment instructions, see: AZURE_DEPLOYMENT.md"
