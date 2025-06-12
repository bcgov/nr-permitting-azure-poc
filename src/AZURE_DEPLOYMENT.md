# Azure Deployment Guide

This guide provides step-by-step instructions for deploying the NR Permitting API to Azure using Container Apps, API Management, and other Azure services.

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Docker installed for building container images
- Azure subscription with appropriate permissions
- Azure Container Registry (ACR) instance
- Azure PostgreSQL Flexible Server instance

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Azure API     │    │  Azure Container │    │  Azure          │
│   Management    │───▶│  Apps            │───▶│  PostgreSQL     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐             │
         │              │  Azure Key Vault │             │
         └─────────────▶│                  │◀────────────┘
                        └──────────────────┘
```

## Step 1: Setup Azure Resources

### 1.1 Create Resource Group
```bash
az group create \
  --name rg-nr-permitting \
  --location canadacentral
```

### 1.2 Create Azure Container Registry
```bash
az acr create \
  --resource-group rg-nr-permitting \
  --name acrnrpermitting \
  --sku Standard \
  --admin-enabled true
```

### 1.3 Create Azure PostgreSQL Flexible Server
```bash
az postgres flexible-server create \
  --resource-group rg-nr-permitting \
  --name psql-nr-permitting \
  --location canadacentral \
  --admin-user nradmin \
  --admin-password 'YourSecurePassword123!' \
  --sku-name Standard_B2s \
  --tier Burstable \
  --storage-size 32 \
  --version 14
```

### 1.4 Create Database
```bash
az postgres flexible-server db create \
  --resource-group rg-nr-permitting \
  --server-name psql-nr-permitting \
  --database-name nr_permitting
```

### 1.5 Create Azure Key Vault
```bash
az keyvault create \
  --resource-group rg-nr-permitting \
  --name kv-nr-permitting \
  --location canadacentral \
  --enabled-for-template-deployment true
```

### 1.6 Store Database Secrets in Key Vault
```bash
az keyvault secret set \
  --vault-name kv-nr-permitting \
  --name db-host \
  --value psql-nr-permitting.postgres.database.azure.com

az keyvault secret set \
  --vault-name kv-nr-permitting \
  --name db-name \
  --value nr_permitting

az keyvault secret set \
  --vault-name kv-nr-permitting \
  --name db-user \
  --value nradmin

az keyvault secret set \
  --vault-name kv-nr-permitting \
  --name db-password \
  --value 'YourSecurePassword123!'
```

## Step 2: Build and Deploy Container

### 2.1 Build and Push Docker Image
```bash
# Login to ACR
az acr login --name acrnrpermitting

# Build and push image
az acr build \
  --registry acrnrpermitting \
  --image nr-permitting-api:latest \
  --file Dockerfile \
  .
```

### 2.2 Create Container Apps Environment
```bash
az containerapp env create \
  --name cae-nr-permitting \
  --resource-group rg-nr-permitting \
  --location canadacentral
```

### 2.3 Deploy Container App
```bash
az containerapp create \
  --name ca-nr-permitting-api \
  --resource-group rg-nr-permitting \
  --environment cae-nr-permitting \
  --image acrnrpermitting.azurecr.io/nr-permitting-api:latest \
  --target-port 3000 \
  --ingress 'external' \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --registry-server acrnrpermitting.azurecr.io \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
    KEY_VAULT_URL=https://kv-nr-permitting.vault.azure.net/ \
    API_VERSION=v1 \
    LOG_LEVEL=info
```

### 2.4 Configure Managed Identity for Key Vault Access
```bash
# Enable system-assigned managed identity
az containerapp identity assign \
  --name ca-nr-permitting-api \
  --resource-group rg-nr-permitting \
  --system-assigned

# Get the principal ID
PRINCIPAL_ID=$(az containerapp identity show \
  --name ca-nr-permitting-api \
  --resource-group rg-nr-permitting \
  --query principalId \
  --output tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name kv-nr-permitting \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

## Step 3: Setup Database Schema

### 3.1 Connect to PostgreSQL and Create Table
```bash
# Connect to the database
az postgres flexible-server connect \
  --name psql-nr-permitting \
  --admin-user nradmin \
  --admin-password 'YourSecurePassword123!' \
  --database-name nr_permitting
```

Execute the following SQL:
```sql
CREATE TABLE record (
    tx_id UUID NOT NULL PRIMARY KEY,
    version TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('RecordLinkage', 'ProcessEventSet')),
    system_id TEXT NOT NULL,
    record_id TEXT NOT NULL,
    record_kind TEXT NOT NULL CHECK (record_kind IN ('Permit', 'Project', 'Submission', 'Tracking')),
    process_event JSONB NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_record_system_record ON record(system_id, record_id);
CREATE INDEX idx_record_kind ON record(record_kind);
CREATE INDEX idx_record_process_event ON record USING GIN(process_event);
```

## Step 4: Setup Azure API Management

### 4.1 Create API Management Instance
```bash
az apim create \
  --resource-group rg-nr-permitting \
  --name apim-nr-permitting \
  --location canadacentral \
  --publisher-email admin@nr-permitting.gov \
  --publisher-name "NR Permitting Team" \
  --sku-name Developer
```

### 4.2 Import OpenAPI Specification
1. Get the Container App URL:
```bash
az containerapp show \
  --name ca-nr-permitting-api \
  --resource-group rg-nr-permitting \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

2. Import the API:
```bash
# Download the OpenAPI spec from the running container
curl -o openapi.yaml https://YOUR_CONTAINER_APP_URL/openapi.json

# Import to API Management
az apim api import \
  --resource-group rg-nr-permitting \
  --service-name apim-nr-permitting \
  --api-id nr-permitting-api \
  --path /permitting \
  --specification-format OpenApi \
  --specification-path openapi.yaml \
  --service-url https://YOUR_CONTAINER_APP_URL
```

### 4.3 Configure API Policies
Add the following inbound policy to enable CORS and rate limiting:

```xml
<policies>
    <inbound>
        <cors allow-credentials="false">
            <allowed-origins>
                <origin>*</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
                <method>PUT</method>
                <method>DELETE</method>
                <method>OPTIONS</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
        </cors>
        <rate-limit calls="100" renewal-period="60" />
        <quota calls="10000" renewal-period="86400" />
        <base />
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
```

## Step 5: Testing and Monitoring

### 5.1 Test API Endpoints
```bash
# Get API Management URL
APIM_URL="https://apim-nr-permitting.azure-api.net"

# Health check
curl "$APIM_URL/permitting/health"

# Create a record (requires subscription key)
curl -X POST "$APIM_URL/permitting/api/v1/records" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: YOUR_SUBSCRIPTION_KEY" \
  -d '{
    "version": "1.0.0",
    "kind": "ProcessEventSet",
    "system_id": "test-system",
    "record_id": "TEST-001",
    "record_kind": "Permit",
    "process_event": {
      "event_type": "application_submitted",
      "timestamp": "2024-01-15T10:30:00Z",
      "applicant_id": "APP-12345"
    }
  }'
```

### 5.2 Setup Monitoring
```bash
# Enable Application Insights for Container App
az monitor app-insights component create \
  --app nr-permitting-insights \
  --location canadacentral \
  --resource-group rg-nr-permitting \
  --kind web

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app nr-permitting-insights \
  --resource-group rg-nr-permitting \
  --query instrumentationKey \
  --output tsv)

# Update Container App with Application Insights
az containerapp update \
  --name ca-nr-permitting-api \
  --resource-group rg-nr-permitting \
  --set-env-vars APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

## Step 6: Security and Compliance

### 6.1 Enable Azure AD Authentication
```bash
# Register application in Azure AD
az ad app create \
  --display-name "NR Permitting API" \
  --identifier-uris "api://nr-permitting-api"

# Configure API Management to use Azure AD
# This requires additional configuration in the Azure portal
```

### 6.2 Network Security
```bash
# Create Virtual Network (optional for additional security)
az network vnet create \
  --resource-group rg-nr-permitting \
  --name vnet-nr-permitting \
  --address-prefix 10.0.0.0/16 \
  --subnet-name subnet-containers \
  --subnet-prefix 10.0.1.0/24
```

## Automation Script

Use the provided `deploy-azure.sh` script for automated deployment:

```bash
./deploy-azure.sh
```

## Troubleshooting

### Common Issues

1. **Container App not starting**: Check logs with:
   ```bash
   az containerapp logs show \
     --name ca-nr-permitting-api \
     --resource-group rg-nr-permitting \
     --follow
   ```

2. **Database connection issues**: Verify firewall rules and connection strings

3. **Key Vault access denied**: Check managed identity permissions

4. **API Management import fails**: Ensure OpenAPI spec is valid and accessible

### Useful Commands

```bash
# View Container App status
az containerapp show --name ca-nr-permitting-api --resource-group rg-nr-permitting

# Scale Container App
az containerapp update \
  --name ca-nr-permitting-api \
  --resource-group rg-nr-permitting \
  --min-replicas 2 \
  --max-replicas 10

# View API Management APIs
az apim api list --resource-group rg-nr-permitting --service-name apim-nr-permitting

# Check Key Vault secrets
az keyvault secret list --vault-name kv-nr-permitting
```

This deployment guide provides a complete setup for the NR Permitting API on Azure with best practices for security, monitoring, and scalability.
