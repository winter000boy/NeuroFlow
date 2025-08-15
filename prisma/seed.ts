import { PrismaClient, WorkflowStatus, ExecutionStatus } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      password: hashedPassword,
      name: 'John Doe',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      email: 'jane.smith@example.com',
      password: hashedPassword,
      name: 'Jane Smith',
    },
  });

  console.log('✅ Created users:', { user1: user1.email, user2: user2.email });

  // Create sample workflows
  const workflow1 = await prisma.workflow.create({
    data: {
      name: 'Email Notification Workflow',
      description: 'Sends email notifications when specific conditions are met',
      definition: {
        nodes: [
          {
            id: 'trigger',
            type: 'webhook',
            name: 'Webhook Trigger',
            parameters: {
              path: '/webhook/email-notification',
              method: 'POST'
            }
          },
          {
            id: 'email',
            type: 'email',
            name: 'Send Email',
            parameters: {
              to: '{{ $json.email }}',
              subject: 'Notification: {{ $json.subject }}',
              body: '{{ $json.message }}'
            }
          }
        ],
        connections: [
          {
            from: 'trigger',
            to: 'email'
          }
        ],
        settings: {
          timezone: 'UTC',
          saveExecutionProgress: true
        }
      },
      status: WorkflowStatus.ACTIVE,
      userId: user1.id,
    },
  });

  const workflow2 = await prisma.workflow.create({
    data: {
      name: 'Data Processing Pipeline',
      description: 'Processes incoming data and stores results in database',
      definition: {
        nodes: [
          {
            id: 'trigger',
            type: 'schedule',
            name: 'Schedule Trigger',
            parameters: {
              cron: '0 */6 * * *'
            }
          },
          {
            id: 'fetch',
            type: 'http',
            name: 'Fetch Data',
            parameters: {
              url: 'https://api.example.com/data',
              method: 'GET'
            }
          },
          {
            id: 'process',
            type: 'function',
            name: 'Process Data',
            parameters: {
              code: 'return items.map(item => ({ ...item, processed: true }));'
            }
          },
          {
            id: 'store',
            type: 'database',
            name: 'Store Results',
            parameters: {
              operation: 'insert',
              table: 'processed_data'
            }
          }
        ],
        connections: [
          { from: 'trigger', to: 'fetch' },
          { from: 'fetch', to: 'process' },
          { from: 'process', to: 'store' }
        ],
        settings: {
          timezone: 'UTC',
          saveExecutionProgress: true,
          retryOnFailure: true,
          maxRetries: 3
        }
      },
      status: WorkflowStatus.ACTIVE,
      userId: user1.id,
    },
  });

  const workflow3 = await prisma.workflow.create({
    data: {
      name: 'Draft Workflow',
      description: 'A workflow still in development',
      definition: {
        nodes: [
          {
            id: 'trigger',
            type: 'manual',
            name: 'Manual Trigger',
            parameters: {}
          }
        ],
        connections: [],
        settings: {
          timezone: 'UTC'
        }
      },
      status: WorkflowStatus.DRAFT,
      userId: user2.id,
    },
  });

  console.log('✅ Created workflows:', { 
    workflow1: workflow1.name, 
    workflow2: workflow2.name,
    workflow3: workflow3.name 
  });

  // Create sample executions
  const execution1 = await prisma.execution.create({
    data: {
      status: ExecutionStatus.SUCCESS,
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      finishedAt: new Date(Date.now() - 3540000), // 59 minutes ago
      inputData: {
        email: 'recipient@example.com',
        subject: 'Test Notification',
        message: 'This is a test message from the workflow'
      },
      outputData: {
        emailSent: true,
        messageId: 'msg_123456789',
        timestamp: new Date().toISOString()
      },
      n8nExecutionId: 'n8n_exec_001',
      workflowId: workflow1.id,
      userId: user1.id,
    },
  });

  const execution2 = await prisma.execution.create({
    data: {
      status: ExecutionStatus.FAILED,
      startedAt: new Date(Date.now() - 7200000), // 2 hours ago
      finishedAt: new Date(Date.now() - 7140000), // 1 hour 59 minutes ago
      inputData: {
        email: 'invalid-email',
        subject: 'Test Notification',
        message: 'This should fail due to invalid email'
      },
      errorMessage: 'Invalid email address format',
      n8nExecutionId: 'n8n_exec_002',
      workflowId: workflow1.id,
      userId: user1.id,
    },
  });

  const execution3 = await prisma.execution.create({
    data: {
      status: ExecutionStatus.RUNNING,
      startedAt: new Date(Date.now() - 300000), // 5 minutes ago
      inputData: {
        source: 'api.example.com',
        batchSize: 100
      },
      n8nExecutionId: 'n8n_exec_003',
      workflowId: workflow2.id,
      userId: user1.id,
    },
  });

  const execution4 = await prisma.execution.create({
    data: {
      status: ExecutionStatus.PENDING,
      startedAt: new Date(),
      inputData: {
        source: 'api.example.com',
        batchSize: 50
      },
      workflowId: workflow2.id,
      userId: user1.id,
    },
  });

  console.log('✅ Created executions:', { 
    execution1: execution1.status, 
    execution2: execution2.status,
    execution3: execution3.status,
    execution4: execution4.status
  });

  // Create sample refresh tokens
  const refreshToken1 = await prisma.refreshToken.create({
    data: {
      token: 'refresh_token_sample_1_' + Date.now(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      userId: user1.id,
    },
  });

  const refreshToken2 = await prisma.refreshToken.create({
    data: {
      token: 'refresh_token_sample_2_' + Date.now(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      userId: user2.id,
    },
  });

  console.log('✅ Created refresh tokens for users');

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: 2`);
  console.log(`- Workflows: 3 (2 active, 1 draft)`);
  console.log(`- Executions: 4 (1 success, 1 failed, 1 running, 1 pending)`);
  console.log(`- Refresh Tokens: 2`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });