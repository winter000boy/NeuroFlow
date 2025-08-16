import swaggerJsdoc from 'swagger-jsdoc';

export const SWAGGER_OPTIONS: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Workflow Automation Platform API',
      version: '1.0.0',
      description: `
        A comprehensive API for managing workflow automation with n8n integration.
        
        ## Features
        - User authentication with JWT tokens
        - Workflow management (CRUD operations)
        - Execution tracking and monitoring
        - Real-time updates via WebSockets
        - n8n integration for workflow execution
        - Comprehensive health monitoring
        
        ## Authentication
        Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API requests are rate-limited to prevent abuse. Current limits:
        - 100 requests per 15 minutes per IP address
        
        ## WebSocket Events
        Real-time updates are available via WebSocket connection at \`/socket.io\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@workflowplatform.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'Development server'
      },
      {
        url: 'https://api.workflowplatform.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        },
        refreshToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Refresh-Token',
          description: 'Refresh token for obtaining new access tokens'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Authentication required'
                      },
                      code: {
                        type: 'string',
                        example: 'UNAUTHORIZED'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error in request data',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Validation failed'
                      },
                      code: {
                        type: 'string',
                        example: 'VALIDATION_ERROR'
                      },
                      details: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: {
                              type: 'string',
                              example: 'email'
                            },
                            message: {
                              type: 'string',
                              example: 'Invalid email format'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Resource not found'
                      },
                      code: {
                        type: 'string',
                        example: 'NOT_FOUND'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Internal server error'
                      },
                      code: {
                        type: 'string',
                        example: 'INTERNAL_ERROR'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      parameters: {
        PaginationLimit: {
          name: 'limit',
          in: 'query',
          description: 'Number of items to return (max 100)',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        PaginationOffset: {
          name: 'offset',
          in: 'query',
          description: 'Number of items to skip',
          required: false,
          schema: {
            type: 'integer',
            minimum: 0,
            default: 0
          }
        },
        SortBy: {
          name: 'sortBy',
          in: 'query',
          description: 'Field to sort by',
          required: false,
          schema: {
            type: 'string'
          }
        },
        SortOrder: {
          name: 'sortOrder',
          in: 'query',
          description: 'Sort order',
          required: false,
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Workflows',
        description: 'Workflow management endpoints'
      },
      {
        name: 'Executions',
        description: 'Workflow execution tracking endpoints'
      },
      {
        name: 'Webhooks',
        description: 'Webhook endpoints for external integrations'
      },
      {
        name: 'Health',
        description: 'Health check and monitoring endpoints'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/schemas/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(SWAGGER_OPTIONS);

// Custom CSS for Swagger UI
export const SWAGGER_UI_OPTIONS = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .swagger-ui .info .description p { font-size: 14px; line-height: 1.6; }
    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #10b981 }
    .swagger-ui .opblock.opblock-post .opblock-summary { border-color: #3b82f6 }
    .swagger-ui .opblock.opblock-put .opblock-summary { border-color: #f59e0b }
    .swagger-ui .opblock.opblock-delete .opblock-summary { border-color: #ef4444 }
  `,
  customSiteTitle: 'Workflow Automation Platform API',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};
