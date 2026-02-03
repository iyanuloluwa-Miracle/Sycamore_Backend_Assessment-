import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sycamore Wallet API',
      version: '1.0.0',
      description: `
A financial backend service featuring idempotent wallet transfers and daily interest accumulation.

## Key Features
- **Idempotent Transfers**: Safe retry semantics with client-provided idempotency keys
- **Race Condition Prevention**: Distributed locking ensures consistency under concurrent requests
- **Interest Accumulator**: Daily interest at 27.5% per annum with precise decimal math
- **Audit Trail**: Full double-entry bookkeeping for every transaction

## Authentication
This API currently runs without authentication for assessment purposes.
In production, implement JWT or OAuth2 before exposing endpoints.
      `,
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Service health checks',
      },
      {
        name: 'Transfers',
        description: 'Wallet-to-wallet money transfers with idempotency support',
      },
      {
        name: 'Wallets',
        description: 'Wallet management and balance inquiries',
      },
      {
        name: 'Interest',
        description: 'Interest calculations, accruals, and projections',
      },
    ],
    components: {
      schemas: {
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            userId: { type: 'string', format: 'uuid' },
            balance: { type: 'string', example: '10000.0000' },
            currency: { type: 'string', example: 'NGN', maxLength: 3 },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TransactionLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            idempotencyKey: { type: 'string', example: 'txn-12345-abc' },
            fromWalletId: { type: 'string', format: 'uuid' },
            toWalletId: { type: 'string', format: 'uuid' },
            amount: { type: 'string', example: '500.0000' },
            currency: { type: 'string', example: 'NGN' },
            type: { type: 'string', enum: ['TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'INTEREST'] },
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'] },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        LedgerEntry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            transactionLogId: { type: 'string', format: 'uuid' },
            walletId: { type: 'string', format: 'uuid' },
            entryType: { type: 'string', enum: ['DEBIT', 'CREDIT'] },
            amount: { type: 'string', example: '500.0000' },
            balanceBefore: { type: 'string', example: '10000.0000' },
            balanceAfter: { type: 'string', example: '9500.0000' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        InterestCalculation: {
          type: 'object',
          properties: {
            principalAmount: { type: 'string', example: '100000.0000' },
            interestAmount: { type: 'string', example: '75.3425' },
            dailyRate: { type: 'string', example: '0.0007534247' },
            annualRate: { type: 'string', example: '0.275' },
            daysInYear: { type: 'integer', example: 365 },
            isLeapYear: { type: 'boolean', example: false },
            accrualDate: { type: 'string', format: 'date', example: '2024-06-15' },
          },
        },
        TransferRequest: {
          type: 'object',
          required: ['fromWalletId', 'toWalletId', 'amount'],
          properties: {
            fromWalletId: { type: 'string', format: 'uuid', description: 'Source wallet ID' },
            toWalletId: { type: 'string', format: 'uuid', description: 'Destination wallet ID' },
            amount: { type: 'number', minimum: 0.0001, example: 500.00, description: 'Amount to transfer' },
            description: { type: 'string', example: 'Payment for services' },
            metadata: { type: 'object', additionalProperties: true },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            limit: { type: 'integer', example: 50 },
            offset: { type: 'integer', example: 0 },
            total: { type: 'integer', example: 100 },
            hasMore: { type: 'boolean', example: true },
          },
        },
      },
      parameters: {
        IdempotencyKey: {
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          schema: { type: 'string' },
          description: 'Unique key for idempotent request handling. Reuse the same key to safely retry requests.',
          example: 'txn-12345-abc',
        },
        WalletId: {
          name: 'walletId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Wallet UUID',
        },
        Limit: {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 50, maximum: 100 },
          description: 'Maximum records to return',
        },
        Offset: {
          name: 'offset',
          in: 'query',
          schema: { type: 'integer', default: 0 },
          description: 'Number of records to skip',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
