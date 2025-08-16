#!/usr/bin/env ts-node

import { PrismaClient } from '../generated/prisma';
import { hashPassword } from '../src/utils/password.util';

const prisma = new PrismaClient();

const sampleWorkflows = [
  {
    name: 'Email Notification Workflow',
    description: 'Send email notifications when specific conditions are met',
    definition: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook',
          name: 'Webhook Trigger',
          parameters: {
            httpMethod: 'POST',
            path: '/webhook/email-notification'
          }
        },
        {
          id: 'condition-1',
          type: 'if',
          name: 'Check Priority',
          parameters: {
            conditions: {
              string: [
                {
                  value1: '={{$json.priority}}',
                  operation: 'equal',
                  value2: 'high'
                }
              ]
            }
          }
        },
        {
          id: 'email-1',
          type: 'emailSend',
          name: 'Send High Priority Email',
          parameters: {
            toEmail: 'admin@company.com',
            subject: 'High Priority Alert',
            message: 'Alert: {{$json.message}}'
          }
        }
      ],
      connections: [
        {
          node: 'trigger-1',
          type: 'main',
          index: 0,
          node2: 'condition-1',
          type2: 'main',
          index2: 0
        },
        {
          node: 'condition-1',
          type: 'main',
          index: 0,
          node2: 'email-1',
          type2: 'main',
          index2: 0
        }
      ]
    },
    status: 'ACTIVE' as const
  },
  {
    name: 'Data Processing Workflow',
    description: 'Process and transform data from multiple sources',
    definition: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'schedule',
          name: 'Daily Schedule',
          parameters: {
            rule: {
              interval: [
                {
                  field: 'cronExpression',
                  value: '0 9 * * *'
                }
              ]
            }
          }
        },
        {
          id: 'http-1',
          type: 'httpRequest',
          name: 'Fetch User Data',
          parameters: {
            url: 'https://api.example.com/users',
            method: 'GET',
            headers: {
              Authorization: 'Bearer {{$env.API_TOKEN}}'
            }
          }
        },
        {
          id: 'function-1',
          type: 'function',
          name: 'Transform Data',
          parameters: {
            functionCode: 'return items.map(item => ({ id: item.id, name: item.name, email: item.email, active: item.status === "active" }));'
          }
        }
      ],
      connections: [
        {
          node: 'trigger-1',
          type: 'main',
          index: 0,
          node2: 'http-1',
          type2: 'main',
          index2: 0
        },
        {
          node: 'http-1',
          type: 'main',
          index: 0,
          node2: 'function-1',
          type2: 'main',
          index2: 0
        }
      ]
    },
    status: 'ACTIVE' as const
  },
  {
    name: 'API Integration Workflow',
    description: 'Sync data between different API services',
    definition: {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook',
          name: 'Customer Update Webhook',
          parameters: {
            httpMethod: 'POST',
            path: '/webhook/customer-update'
          }
        },
        {
          id: 'http-1',
          type: 'httpRequest',
          name: 'Get Customer Details',
          parameters: {
            url: 'https://crm.example.com/api/customers/{{$json.customerId}}',
            method: 'GET',
            headers: {
              Authorization: 'Bearer {{$env.CRM_TOKEN}}'
            }
          }
        }
      ],
      connections: [
        {
          node: 'trigger-1',
          type: 'main',
          index: 0,
          node2: 'http-1',
          type2: 'main',
          index2: 0
        }
      ]
    },
    status: 'DRAFT' as const
  }
];

async function seedTestData() {
  console.log('🌱 Seeding test data...');

  try {
    // Create test users
    const testUsers = [
      {
        name: 'Demo User',
        email: 'demo@example.com',
        password: await hashPassword('demo123'),
      },
      {
        name: 'Test Admin',
        email: 'admin@example.com',
        password: await hashPassword('admin123'),
      }
    ];

    console.log('Creating test users...');
    const users = await Promise.all(
      testUsers.map(userData => 
        prisma.user.upsert({
          where: { email: userData.email },
          update: userData,
          create: userData,
        })
      )
    );

    console.log(`✅ Created ${users.length} test users`);

    // Create sample workflows for each user
    console.log('Creating sample workflows...');
    const workflows = [];
    
    for (const user of users) {
      for (const workflowData of sampleWorkflows) {
        const workflow = await prisma.workflow.create({
          data: {
            ...workflowData,
            userId: user.id,
          }
        });
        workflows.push(workflow);
      }
    }

    console.log(`✅ Created ${workflows.length} sample workflows`);

    // Create sample executions
    console.log('Creating sample executions...');
    const executionStatuses = ['SUCCESS', 'FAILED', 'RUNNING', 'PENDING'] as const;
    const executions = [];

    for (const workflow of workflows) {
      // Create 3-5 executions per workflow
      const executionCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < executionCount; i++) {
        const startedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last 7 days
        const status = executionStatuses[Math.floor(Math.random() * executionStatuses.length)];
        const finishedAt = ['SUCCESS', 'FAILED'].includes(status) 
          ? new Date(startedAt.getTime() + Math.random() * 60 * 60 * 1000) // Random duration up to 1 hour
          : null;

        const execution = await prisma.execution.create({
          data: {
            workflowId: workflow.id,
            userId: workflow.userId,
            status,
            startedAt,
            finishedAt,
            inputData: {
              message: `Test execution ${i + 1}`,
              priority: Math.random() > 0.5 ? 'high' : 'normal',
              timestamp: startedAt.toISOString(),
            },
            outputData: status === 'SUCCESS' ? {
              result: 'Execution completed successfully',
              processedAt: finishedAt?.toISOString(),
            } : null,
            errorMessage: status === 'FAILED' ? 'Sample error message for testing' : null,
            n8nExecutionId: `n8n_${Math.random().toString(36).substr(2, 9)}`,
          }
        });
        executions.push(execution);
      }
    }

    console.log(`✅ Created ${executions.length} sample executions`);

    // Create some refresh tokens for testing
    console.log('Creating refresh tokens...');
    const refreshTokens = await Promise.all(
      users.map(user => 
        prisma.refreshToken.create({
          data: {
            userId: user.id,
            token: `refresh_${Math.random().toString(36).substr(2, 32)}`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          }
        })
      )
    );

    console.log(`✅ Created ${refreshTokens.length} refresh tokens`);

    console.log('\n🎉 Test data seeding completed successfully!');
    console.log('\nTest accounts created:');
    testUsers.forEach(user => {
      console.log(`  📧 ${user.email} (password: ${user.email === 'demo@example.com' ? 'demo123' : 'admin123'})`);
    });

    console.log('\nYou can now:');
    console.log('  1. Log in with any of the test accounts');
    console.log('  2. View sample workflows in the Workflows section');
    console.log('  3. See execution history in the Executions section');
    console.log('  4. Explore the dashboard with populated data');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
if (require.main === module) {
  seedTestData()
    .then(() => {
      console.log('\n✨ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding process failed:', error);
      process.exit(1);
    });
}

export { seedTestData };