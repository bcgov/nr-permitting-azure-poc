# NR Permitting API

A TypeScript-based REST API built with Express and Kysely for Natural Resources Permitting system integration with Azure services.

## Features

- **TypeScript & Express**: Modern, type-safe API development
- **Kysely ORM**: Type-safe SQL query builder for PostgreSQL
- **Azure Integration**: Seamless integration with Azure PostgreSQL, Key Vault, and API Management
- **OpenAPI Specification**: Complete API documentation compatible with Azure API Management
- **Security**: Comprehensive security middleware, rate limiting, and authentication support
- **Monitoring**: Health checks, structured logging, and performance monitoring
- **Docker Support**: Container-ready with multi-stage builds
- **Testing**: Jest-based testing framework with coverage reporting

## Architecture

```
src/
├── config/          # Configuration files (database, logging, swagger)
├── controllers/     # Request handlers and business logic
├── middleware/      # Express middleware (validation, error handling)
├── routes/          # API route definitions
├── services/        # Business logic and data access layer
├── types/           # TypeScript type definitions
└── __tests__/       # Test files
```

## Database Schema

The API works with a PostgreSQL database with the following table structure:

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
```

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Azure account (for production deployment)
- Docker (optional, for containerized deployment)

## Quick Start

### 1. Installation

```bash
# Clone the repository
cd src

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
```

### 2. Environment Configuration

Configure your `.env` file with the following variables:

```env
# Environment
NODE_ENV=development
PORT=3000

# Azure Configuration (for production)
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id
KEY_VAULT_URL=https://your-keyvault.vault.azure.net/

# Database Configuration
DB_HOST=your-postgres-host.postgres.database.azure.com
DB_PORT=5432
DB_NAME=nr_permitting
DB_USER=your-username
DB_PASSWORD=your-password
DB_SSL=true
```

### 3. Database Setup

Create the database table:

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
```

### 4. Running the Application

```bash
# Development mode with hot reload
npm run dev

# Production build and start
npm run build
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### Records Management

#### Create Record
```http
POST /api/v1/records
Content-Type: application/json
Ocp-Apim-Subscription-Key: your-subscription-key

{
  "version": "1.0.0",
  "kind": "ProcessEventSet",
  "system_id": "nr-permits-system",
  "record_id": "PERMIT-2024-001",
  "record_kind": "Permit",
  "process_event": {
    "event_type": "application_submitted",
    "timestamp": "2024-01-15T10:30:00Z",
    "applicant_id": "APP-12345",
    "permit_type": "timber_harvest",
    "location": {
      "latitude": 54.7267,
      "longitude": -127.7476
    }
  }
}
```

#### Get Record
```http
GET /api/v1/records/{tx_id}
Ocp-Apim-Subscription-Key: your-subscription-key
```

### Health Monitoring

- `GET /health` - Comprehensive health check
- `GET /liveness` - Kubernetes liveness probe
- `GET /readiness` - Kubernetes readiness probe

### API Documentation

- `GET /api-docs` - Swagger UI documentation
- `GET /openapi.json` - OpenAPI specification (JSON)

## Azure Integration

### Azure API Management Import

1. Generate the OpenAPI specification:
```bash
npm run generate-openapi
```

2. Import to Azure API Management:
   - Open Azure Portal → API Management instance
   - Go to APIs → Add API → OpenAPI
   - Upload `docs/openapi-azure.yaml`
   - Configure subscription keys and policies

### Azure PostgreSQL Configuration

The API supports Azure PostgreSQL with SSL and can retrieve connection details from Azure Key Vault:

```typescript
// Secrets stored in Key Vault:
// - db-host
// - db-port
// - db-name
// - db-user
// - db-password
```

### Azure Container Apps Deployment

Build and deploy using Docker:

```bash
# Build container image
docker build -t nr-permitting-api .

# Tag for Azure Container Registry
docker tag nr-permitting-api your-acr.azurecr.io/nr-permitting-api:latest

# Push to registry
docker push your-acr.azurecr.io/nr-permitting-api:latest
```

## Security Features

- **Helmet.js**: Security headers and protections
- **Rate Limiting**: Configurable request throttling
- **CORS**: Cross-origin resource sharing configuration
- **Input Validation**: Joi-based request validation
- **Error Handling**: Structured error responses
- **Authentication**: Azure AD integration support

## Monitoring & Logging

- **Structured Logging**: Winston-based logging with different formats for development/production
- **Request Tracing**: Unique request IDs for correlation
- **Health Checks**: Multiple endpoints for different monitoring needs
- **Performance Metrics**: Database latency and connection monitoring

## Development

### Project Structure

```
src/
├── config/
│   ├── database.ts      # Database configuration with Azure Key Vault
│   ├── logger.ts        # Winston logging configuration
│   └── swagger.ts       # OpenAPI specification
├── controllers/
│   ├── recordController.ts   # Record management endpoints
│   └── healthController.ts   # Health check endpoints
├── middleware/
│   ├── validation.ts         # Request validation middleware
│   └── errorHandler.ts       # Global error handling
├── routes/
│   ├── records.ts           # Record routes
│   └── health.ts            # Health routes
├── services/
│   └── recordService.ts     # Business logic layer
└── types/
    ├── database.ts          # Database type definitions
    └── express.d.ts         # Express type extensions
```

### Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Jest**: Unit testing framework
- **Coverage**: Code coverage reporting

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Docker Deployment

The application includes a multi-stage Dockerfile optimized for production:

```bash
# Build image
docker build -t nr-permitting-api .

# Run container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  nr-permitting-api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api-docs`
