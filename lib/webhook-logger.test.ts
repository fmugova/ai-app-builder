// lib/webhook-logger.test.ts
import { logWebhookEvent, updateWebhookEvent, isWebhookEventProcessed, getWebhookStats, retryFailedWebhook } from './webhook-logger'
import { prisma } from './prisma'

// Mock Prisma
jest.mock('./prisma', () => ({
  prisma: {
    webhookEvent: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

describe('webhook-logger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('logWebhookEvent', () => {
    it('should create webhook event with pending status', async () => {
      const mockEvent = { id: 'wh_123' }
      ;(prisma.webhookEvent.create as jest.Mock).mockResolvedValue(mockEvent)

      const id = await logWebhookEvent({
        provider: 'stripe',
        eventType: 'checkout.session.completed',
        eventId: 'evt_123',
        data: { amount: 2000 },
        userId: 'user_123',
      })

      expect(id).toBe('wh_123')
      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: {
          provider: 'stripe',
          eventType: 'checkout.session.completed',
          eventId: 'evt_123',
          payload: { amount: 2000 },
          metadata: {},
          userId: 'user_123',
          status: 'pending',
          error: undefined,
          processedAt: null,
        },
      })
    })

    it('should create webhook event with processed status', async () => {
      const mockEvent = { id: 'wh_456' }
      ;(prisma.webhookEvent.create as jest.Mock).mockResolvedValue(mockEvent)

      await logWebhookEvent(
        {
          provider: 'stripe',
          eventType: 'invoice.paid',
          data: { invoice_id: 'inv_123' },
        },
        { status: 'processed' }
      )

      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'processed',
          processedAt: expect.any(Date),
        }),
      })
    })

    it('should create webhook event with failed status and error', async () => {
      const mockEvent = { id: 'wh_789' }
      ;(prisma.webhookEvent.create as jest.Mock).mockResolvedValue(mockEvent)

      await logWebhookEvent(
        {
          provider: 'stripe',
          eventType: 'payment_intent.failed',
          data: {},
        },
        { status: 'failed', error: 'Payment processing failed' }
      )

      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'failed',
          error: 'Payment processing failed',
        }),
      })
    })

    it('should handle logging errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(prisma.webhookEvent.create as jest.Mock).mockRejectedValue(new Error('Database error'))

      const id = await logWebhookEvent({
        provider: 'stripe',
        eventType: 'test',
        data: {},
      })

      expect(id).toBe('')
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('updateWebhookEvent', () => {
    it('should update webhook to processed status', async () => {
      await updateWebhookEvent('wh_123', 'processed')

      expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'wh_123' },
        data: {
          status: 'processed',
          error: undefined,
          processedAt: expect.any(Date),
        },
      })
    })

    it('should update webhook to failed status with error', async () => {
      await updateWebhookEvent('wh_456', 'failed', 'Invalid signature')

      expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'wh_456' },
        data: {
          status: 'failed',
          error: 'Invalid signature',
          processedAt: expect.any(Date),
        },
      })
    })

    it('should handle update errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(prisma.webhookEvent.update as jest.Mock).mockRejectedValue(new Error('Update failed'))

      await updateWebhookEvent('wh_789', 'processed')

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('isWebhookEventProcessed', () => {
    it('should return true if event was already processed', async () => {
      ;(prisma.webhookEvent.findFirst as jest.Mock).mockResolvedValue({ id: 'wh_123' })

      const result = await isWebhookEventProcessed('stripe', 'evt_123')

      expect(result).toBe(true)
      expect(prisma.webhookEvent.findFirst).toHaveBeenCalledWith({
        where: {
          provider: 'stripe',
          eventId: 'evt_123',
          status: 'processed',
        },
      })
    })

    it('should return false if event was not processed', async () => {
      ;(prisma.webhookEvent.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await isWebhookEventProcessed('stripe', 'evt_456')

      expect(result).toBe(false)
    })

    it('should return false if eventId is not provided', async () => {
      const result = await isWebhookEventProcessed('stripe', '')

      expect(result).toBe(false)
      expect(prisma.webhookEvent.findFirst).not.toHaveBeenCalled()
    })

    it('should handle check errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(prisma.webhookEvent.findFirst as jest.Mock).mockRejectedValue(new Error('Query failed'))

      const result = await isWebhookEventProcessed('stripe', 'evt_789')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('getWebhookStats', () => {
    it('should return webhook statistics', async () => {
      ;(prisma.webhookEvent.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85)  // processed
        .mockResolvedValueOnce(10)  // failed
        .mockResolvedValueOnce(5)   // pending

      const stats = await getWebhookStats('stripe', 24)

      expect(stats).toEqual({
        total: 100,
        processed: 85,
        failed: 10,
        pending: 5,
        successRate: '85.00%',
      })
    })

    it('should filter by provider', async () => {
      ;(prisma.webhookEvent.count as jest.Mock).mockResolvedValue(50)

      await getWebhookStats('github', 48)

      expect(prisma.webhookEvent.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            provider: 'github',
          }),
        })
      )
    })

    it('should handle zero events gracefully', async () => {
      ;(prisma.webhookEvent.count as jest.Mock).mockResolvedValue(0)

      const stats = await getWebhookStats()

      expect(stats.successRate).toBe('0%')
    })

    it('should handle stats errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(prisma.webhookEvent.count as jest.Mock).mockRejectedValue(new Error('Stats failed'))

      const stats = await getWebhookStats()

      expect(stats).toEqual({ total: 0, processed: 0, failed: 0, pending: 0, successRate: '0%' })
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('retryFailedWebhook', () => {
    it('should reset failed webhook to pending', async () => {
      ;(prisma.webhookEvent.findUnique as jest.Mock).mockResolvedValue({
        id: 'wh_123',
        status: 'failed',
      })
      ;(prisma.webhookEvent.update as jest.Mock).mockResolvedValue({})

      const result = await retryFailedWebhook('wh_123')

      expect(result).toBe(true)
      expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'wh_123' },
        data: {
          status: 'pending',
          error: null,
          processedAt: null,
        },
      })
    })

    it('should return false if webhook is not failed', async () => {
      ;(prisma.webhookEvent.findUnique as jest.Mock).mockResolvedValue({
        id: 'wh_456',
        status: 'processed',
      })

      const result = await retryFailedWebhook('wh_456')

      expect(result).toBe(false)
      expect(prisma.webhookEvent.update).not.toHaveBeenCalled()
    })

    it('should return false if webhook not found', async () => {
      ;(prisma.webhookEvent.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await retryFailedWebhook('wh_789')

      expect(result).toBe(false)
    })

    it('should handle retry errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      ;(prisma.webhookEvent.findUnique as jest.Mock).mockRejectedValue(new Error('Retry failed'))

      const result = await retryFailedWebhook('wh_999')

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Webhook Event Structure', () => {
    it('should store all required fields', async () => {
      const mockEvent = { id: 'wh_complete' }
      ;(prisma.webhookEvent.create as jest.Mock).mockResolvedValue(mockEvent)

      await logWebhookEvent({
        provider: 'stripe',
        eventType: 'checkout.session.completed',
        eventId: 'evt_complete',
        data: {
          id: 'cs_123',
          amount_total: 2000,
          customer: 'cus_123',
        },
        metadata: {
          livemode: true,
          apiVersion: '2023-10-16',
        },
        userId: 'user_123',
      })

      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'stripe',
          eventType: 'checkout.session.completed',
          eventId: 'evt_complete',
          payload: expect.objectContaining({
            id: 'cs_123',
            amount_total: 2000,
          }),
          metadata: expect.objectContaining({
            livemode: true,
          }),
          userId: 'user_123',
        }),
      })
    })
  })
})
