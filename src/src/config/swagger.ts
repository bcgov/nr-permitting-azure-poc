import swaggerJsdoc from 'swagger-jsdoc';

/**
 * OpenAPI specification configuration optimized for Azure API Management
 * Includes proper authentication, rate limiting, and Azure-specific configurations
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: process.env.API_TITLE || 'NR Permitting API',
      version: process.env.API_VERSION || '1.0.0',
      description: process.env.API_DESCRIPTION || 'Natural Resources Permitting API with Azure Integration',
      contact: {
        name: 'NR Permitting Team',
        email: 'support@nr-permitting.gov',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.nr-permitting.gov/v1'
          : `http://localhost:${process.env.PORT || 3000}/api/v1`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        // Azure API Management subscription key
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Ocp-Apim-Subscription-Key',
          description: 'Azure API Management subscription key',
        },
        // OAuth2 for Azure AD integration
        OAuth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
              tokenUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
              scopes: {
                'api://nr-permitting/Records.Write': 'Write access to records',
                'api://nr-permitting/Records.Read': 'Read access to records',
              },
            },
          },
        },
      },
      schemas: {
        CreateRecordRequest: {
          type: 'object',
          required: ['version', 'kind', 'system_id', 'record_id', 'record_kind', 'process_event'],
          properties: {
            version: {
              type: 'string',
              description: 'Version of the record format',
              example: '1.0.0',
            },
            kind: {
              type: 'string',
              enum: ['RecordLinkage', 'ProcessEventSet'],
              description: 'Type of record being created',
            },
            system_id: {
              type: 'string',
              description: 'Identifier of the system creating the record',
              example: 'nr-permits-system',
            },
            record_id: {
              type: 'string',
              description: 'Unique identifier for the record within the system',
              example: 'PERMIT-2024-001',
            },
            record_kind: {
              type: 'string',
              enum: ['Permit', 'Project', 'Submission', 'Tracking'],
              description: 'Category of the record',
            },
            process_event: {
              type: 'object',
              description: 'JSON object containing the process event data',
              additionalProperties: true,
              example: {
                event_type: 'application_submitted',
                timestamp: '2024-01-15T10:30:00Z',
                applicant_id: 'APP-12345',
                permit_type: 'timber_harvest',
                location: {
                  latitude: 54.7267,
                  longitude: -127.7476,
                },
              },
            },
          },
        },
        CreateRecordResponse: {
          type: 'object',
          properties: {
            tx_id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique transaction identifier',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            version: {
              type: 'string',
              description: 'Version of the record format',
            },
            kind: {
              type: 'string',
              description: 'Type of record',
            },
            system_id: {
              type: 'string',
              description: 'System identifier',
            },
            record_id: {
              type: 'string',
              description: 'Record identifier',
            },
            record_kind: {
              type: 'string',
              description: 'Category of the record',
            },
            process_event: {
              type: 'object',
              description: 'Process event data',
              additionalProperties: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
            },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
            },
            message: {
              type: 'string',
              description: 'Human-readable error message',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
              additionalProperties: true,
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
            },
            path: {
              type: 'string',
              description: 'API path where error occurred',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              description: 'Overall system health status',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp',
            },
            version: {
              type: 'string',
              description: 'API version',
            },
            database: {
              type: 'object',
              properties: {
                connected: {
                  type: 'boolean',
                  description: 'Database connection status',
                },
                latency_ms: {
                  type: 'number',
                  description: 'Database response latency in milliseconds',
                },
              },
            },
            environment: {
              type: 'string',
              description: 'Deployment environment',
            },
          },
        },
      },
    },
    security: [
      {
        ApiKeyAuth: [],
      },
    ],
    paths: {},
  },
  apis: [
    './src/controllers/*.ts',
    './src/routes/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
