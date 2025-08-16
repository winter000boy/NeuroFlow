# Sample Workflows

This document provides examples of workflows that can be created and executed in the Workflow Automation Platform.

## 1. Email Notification Workflow

**Purpose**: Send email notifications when specific conditions are met.

**Workflow Definition**:
```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "webhook",
      "name": "Webhook Trigger",
      "parameters": {
        "httpMethod": "POST",
        "path": "/webhook/email-notification"
      }
    },
    {
      "id": "condition-1",
      "type": "if",
      "name": "Check Priority",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.priority}}",
              "operation": "equal",
              "value2": "high"
            }
          ]
        }
      }
    },
    {
      "id": "email-1",
      "type": "emailSend",
      "name": "Send High Priority Email",
      "parameters": {
        "toEmail": "admin@company.com",
        "subject": "High Priority Alert",
        "message": "Alert: {{$json.message}}"
      }
    },
    {
      "id": "email-2",
      "type": "emailSend",
      "name": "Send Normal Email",
      "parameters": {
        "toEmail": "team@company.com",
        "subject": "Notification",
        "message": "Info: {{$json.message}}"
      }
    }
  ],
  "connections": [
    {
      "node": "trigger-1",
      "type": "main",
      "index": 0,
      "node2": "condition-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "condition-1",
      "type": "main",
      "index": 0,
      "node2": "email-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "condition-1",
      "type": "main",
      "index": 1,
      "node2": "email-2",
      "type2": "main",
      "index2": 0
    }
  ]
}
```

**Sample Input Data**:
```json
{
  "priority": "high",
  "message": "Server CPU usage is above 90%",
  "timestamp": "2025-01-16T10:30:00Z"
}
```

## 2. Data Processing Workflow

**Purpose**: Process and transform data from multiple sources.

**Workflow Definition**:
```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "schedule",
      "name": "Daily Schedule",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "value": "0 9 * * *"
            }
          ]
        }
      }
    },
    {
      "id": "http-1",
      "type": "httpRequest",
      "name": "Fetch User Data",
      "parameters": {
        "url": "https://api.example.com/users",
        "method": "GET",
        "headers": {
          "Authorization": "Bearer {{$env.API_TOKEN}}"
        }
      }
    },
    {
      "id": "function-1",
      "type": "function",
      "name": "Transform Data",
      "parameters": {
        "functionCode": "return items.map(item => ({ id: item.id, name: item.name, email: item.email, active: item.status === 'active' }));"
      }
    },
    {
      "id": "database-1",
      "type": "postgres",
      "name": "Save to Database",
      "parameters": {
        "operation": "insert",
        "table": "users",
        "columns": "id, name, email, active"
      }
    }
  ],
  "connections": [
    {
      "node": "trigger-1",
      "type": "main",
      "index": 0,
      "node2": "http-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "http-1",
      "type": "main",
      "index": 0,
      "node2": "function-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "function-1",
      "type": "main",
      "index": 0,
      "node2": "database-1",
      "type2": "main",
      "index2": 0
    }
  ]
}
```

## 3. File Processing Workflow

**Purpose**: Monitor a directory for new files and process them.

**Workflow Definition**:
```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "fileWatcher",
      "name": "Watch Directory",
      "parameters": {
        "path": "/uploads",
        "watchFor": "added"
      }
    },
    {
      "id": "condition-1",
      "type": "if",
      "name": "Check File Type",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.fileName}}",
              "operation": "regex",
              "value2": "\\.(csv|xlsx)$"
            }
          ]
        }
      }
    },
    {
      "id": "csv-1",
      "type": "readCSV",
      "name": "Read CSV File",
      "parameters": {
        "filePath": "={{$json.filePath}}",
        "delimiter": ",",
        "hasHeaders": true
      }
    },
    {
      "id": "function-1",
      "type": "function",
      "name": "Validate Data",
      "parameters": {
        "functionCode": "return items.filter(item => item.email && item.email.includes('@'));"
      }
    },
    {
      "id": "email-1",
      "type": "emailSend",
      "name": "Send Processing Report",
      "parameters": {
        "toEmail": "admin@company.com",
        "subject": "File Processing Complete",
        "message": "Processed {{$json.length}} records from {{$node.trigger-1.json.fileName}}"
      }
    }
  ],
  "connections": [
    {
      "node": "trigger-1",
      "type": "main",
      "index": 0,
      "node2": "condition-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "condition-1",
      "type": "main",
      "index": 0,
      "node2": "csv-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "csv-1",
      "type": "main",
      "index": 0,
      "node2": "function-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "function-1",
      "type": "main",
      "index": 0,
      "node2": "email-1",
      "type2": "main",
      "index2": 0
    }
  ]
}
```

## 4. API Integration Workflow

**Purpose**: Sync data between different API services.

**Workflow Definition**:
```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "webhook",
      "name": "Customer Update Webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "/webhook/customer-update"
      }
    },
    {
      "id": "http-1",
      "type": "httpRequest",
      "name": "Get Customer Details",
      "parameters": {
        "url": "https://crm.example.com/api/customers/{{$json.customerId}}",
        "method": "GET",
        "headers": {
          "Authorization": "Bearer {{$env.CRM_TOKEN}}"
        }
      }
    },
    {
      "id": "function-1",
      "type": "function",
      "name": "Transform for Marketing",
      "parameters": {
        "functionCode": "return [{ email: item.email, firstName: item.firstName, lastName: item.lastName, tags: ['customer', item.segment] }];"
      }
    },
    {
      "id": "http-2",
      "type": "httpRequest",
      "name": "Update Marketing Platform",
      "parameters": {
        "url": "https://marketing.example.com/api/contacts",
        "method": "PUT",
        "headers": {
          "Authorization": "Bearer {{$env.MARKETING_TOKEN}}",
          "Content-Type": "application/json"
        },
        "body": "={{JSON.stringify($json)}}"
      }
    },
    {
      "id": "http-3",
      "type": "httpRequest",
      "name": "Update Support System",
      "parameters": {
        "url": "https://support.example.com/api/customers/{{$node.trigger-1.json.customerId}}",
        "method": "PATCH",
        "headers": {
          "Authorization": "Bearer {{$env.SUPPORT_TOKEN}}",
          "Content-Type": "application/json"
        },
        "body": "={{JSON.stringify({ name: $node.http-1.json.firstName + ' ' + $node.http-1.json.lastName, email: $node.http-1.json.email })}}"
      }
    }
  ],
  "connections": [
    {
      "node": "trigger-1",
      "type": "main",
      "index": 0,
      "node2": "http-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "http-1",
      "type": "main",
      "index": 0,
      "node2": "function-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "function-1",
      "type": "main",
      "index": 0,
      "node2": "http-2",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "http-1",
      "type": "main",
      "index": 0,
      "node2": "http-3",
      "type2": "main",
      "index2": 0
    }
  ]
}
```

## 5. Monitoring and Alerting Workflow

**Purpose**: Monitor system health and send alerts when issues are detected.

**Workflow Definition**:
```json
{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "schedule",
      "name": "Every 5 Minutes",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "value": "*/5 * * * *"
            }
          ]
        }
      }
    },
    {
      "id": "http-1",
      "type": "httpRequest",
      "name": "Check API Health",
      "parameters": {
        "url": "https://api.example.com/health",
        "method": "GET",
        "timeout": 10000
      }
    },
    {
      "id": "condition-1",
      "type": "if",
      "name": "Check Response",
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{$json.status}}",
              "operation": "notEqual",
              "value2": 200
            }
          ]
        }
      }
    },
    {
      "id": "slack-1",
      "type": "slack",
      "name": "Send Alert to Slack",
      "parameters": {
        "channel": "#alerts",
        "text": "🚨 API Health Check Failed - Status: {{$node.http-1.json.status}}"
      }
    },
    {
      "id": "email-1",
      "type": "emailSend",
      "name": "Send Email Alert",
      "parameters": {
        "toEmail": "oncall@company.com",
        "subject": "API Health Check Failed",
        "message": "The API health check failed with status {{$node.http-1.json.status}} at {{new Date().toISOString()}}"
      }
    }
  ],
  "connections": [
    {
      "node": "trigger-1",
      "type": "main",
      "index": 0,
      "node2": "http-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "http-1",
      "type": "main",
      "index": 0,
      "node2": "condition-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "condition-1",
      "type": "main",
      "index": 0,
      "node2": "slack-1",
      "type2": "main",
      "index2": 0
    },
    {
      "node": "condition-1",
      "type": "main",
      "index": 0,
      "node2": "email-1",
      "type2": "main",
      "index2": 0
    }
  ]
}
```

## How to Use These Samples

1. **Copy the workflow definition** from any of the examples above
2. **Navigate to the Workflows page** in the application
3. **Click "Create Workflow"**
4. **Paste the JSON definition** into the workflow definition field
5. **Customize the parameters** to match your environment (API endpoints, email addresses, etc.)
6. **Save and activate** the workflow
7. **Test the workflow** with the provided sample input data

## Environment Variables

Many of these workflows use environment variables for sensitive data like API tokens. Make sure to configure these in your n8n instance:

- `API_TOKEN` - Generic API authentication token
- `CRM_TOKEN` - CRM system API token
- `MARKETING_TOKEN` - Marketing platform API token
- `SUPPORT_TOKEN` - Support system API token

## Best Practices

1. **Always test workflows** with sample data before activating them
2. **Use environment variables** for sensitive information
3. **Add error handling** nodes to manage failures gracefully
4. **Monitor execution logs** to ensure workflows are running correctly
5. **Document your workflows** with clear names and descriptions
6. **Use conditional logic** to handle different scenarios
7. **Implement retry mechanisms** for critical operations

## Troubleshooting

If a workflow fails to execute:

1. Check the execution logs for error messages
2. Verify all required environment variables are set
3. Test individual nodes to isolate the issue
4. Ensure API endpoints are accessible and credentials are valid
5. Check data formats and transformations
6. Review webhook URLs and authentication settings