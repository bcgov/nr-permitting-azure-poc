#!/bin/bash

# Azure Container Apps Deployment Script for NR Permitting API
# This script demonstrates how to deploy the API to Azure Container Apps

set -e

# Configuration variables
RESOURCE_GROUP="rg-nr-permitting"
LOCATION="canadacentral"
CONTAINER_APP_ENV="cae-nr-permitting"
CONTAINER_APP_NAME="ca-nr-permitting-api"
ACR_NAME="crcbc6931e"
IMAGE_NAME="nr-permitting-api"
IMAGE_TAG="latest"

echo "🚀 Starting Azure Container Apps deployment for NR Permitting API..."

# Login to Azure (if not already logged in)
echo "📋 Checking Azure login status..."
az account show > /dev/null 2>&1 || (echo "Please login to Azure first: az login" && exit 1)

# Build and push Docker image to Azure Container Registry
echo "🔨 Building and pushing Docker image..."
az acr build \
  --registry $ACR_NAME \
  --image $IMAGE_NAME:$IMAGE_TAG \
  --file Dockerfile \
  .

# Create Container Apps environment (if it doesn't exist)
echo "🏗️  Creating Container Apps environment..."
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-workload-profiles

# Create the Container App
echo "📦 Deploying Container App..."
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG \
  --target-port 3000 \
  --ingress 'external' \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
    API_VERSION=v1 \
    LOG_LEVEL=info \
  --secrets \
    db-host=keyvault-ref:https://your-keyvault.vault.azure.net/secrets/db-host \
    db-name=keyvault-ref:https://your-keyvault.vault.azure.net/secrets/db-name \
    db-user=keyvault-ref:https://your-keyvault.vault.azure.net/secrets/db-user \
    db-password=keyvault-ref:https://your-keyvault.vault.azure.net/secrets/db-password

# Get the Container App URL
echo "🌐 Getting Container App URL..."
FQDN=$(az containerapp show \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 Container App URL: https://$FQDN"
echo "📚 API Documentation: https://$FQDN/api-docs"
echo "🏥 Health Check: https://$FQDN/health"
echo "📋 OpenAPI Spec: https://$FQDN/openapi.json"
echo ""
echo "🔧 To update the deployment:"
echo "   az containerapp update --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --image $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG"
echo ""
echo "📊 To view logs:"
echo "   az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --follow"
echo ""
echo "🔍 To view app details:"
echo "   az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP"
