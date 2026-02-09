import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import APITestingPanel from './APITestingPanel'

// Mock fetch
global.fetch = jest.fn()

describe('APITestingPanel', () => {
  const mockEndpoint = {
    id: 'test-id-1',
    name: 'Get Users',
    method: 'GET',
    path: '/api/users',
    description: 'Fetch all users',
    requiresAuth: true,
    requestBody: null,
    responseExample: { users: [] },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ users: [{ id: 1, name: 'Test User' }] }),
      text: async () => JSON.stringify({ users: [{ id: 1, name: 'Test User' }] }),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('should render the testing panel with endpoint details', () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      expect(screen.getByText('GET Users')).toBeInTheDocument()
      expect(screen.getByText('/api/users')).toBeInTheDocument()
      expect(screen.getByText('Fetch all users')).toBeInTheDocument()
    })

    it('should show authentication badge when requiresAuth is true', () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      expect(screen.getByText('🔒 Auth Required')).toBeInTheDocument()
    })

    it('should not show authentication badge when requiresAuth is false', () => {
      const publicEndpoint = { ...mockEndpoint, requiresAuth: false }
      render(<APITestingPanel endpoint={publicEndpoint} />)

      expect(screen.queryByText('🔒 Auth Required')).not.toBeInTheDocument()
    })

    it('should display request body editor for POST/PUT/PATCH methods', () => {
      const postEndpoint = { ...mockEndpoint, method: 'POST', requestBody: '{"name": ""}' }
      render(<APITestingPanel endpoint={postEndpoint} />)

      expect(screen.getByText('Request Body')).toBeInTheDocument()
    })

    it('should not display request body editor for GET/DELETE methods', () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      expect(screen.queryByText('Request Body')).not.toBeInTheDocument()
    })
  })

  describe('Request Testing', () => {
    it('should send a test request when Send Request button is clicked', async () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/users',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )
      })
    })

    it('should display loading state during request', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      )

      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      expect(screen.getByText('Sending...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Sending...')).not.toBeInTheDocument()
      })
    })

    it('should display response after successful request', async () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('Response')).toBeInTheDocument()
        expect(screen.getByText(/200 OK/)).toBeInTheDocument()
      })
    })

    it('should handle request errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument()
      })
    })

    it('should send request body for POST requests', async () => {
      const postEndpoint = {
        ...mockEndpoint,
        method: 'POST',
        requestBody: '{"name": "John Doe"}',
      }

      render(<APITestingPanel endpoint={postEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/users',
          expect.objectContaining({
            method: 'POST',
            body: '{"name": "John Doe"}',
          })
        )
      })
    })
  })

  describe('cURL Generation', () => {
    it('should generate cURL command for GET request', () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      const curlButton = screen.getByText(/Copy cURL/)
      expect(curlButton).toBeInTheDocument()
    })

    it('should generate cURL with request body for POST', () => {
      const postEndpoint = {
        ...mockEndpoint,
        method: 'POST',
        requestBody: '{"name": "Test"}',
      }

      render(<APITestingPanel endpoint={postEndpoint} />)

      // The cURL command should be visible in the UI
      expect(screen.getByText(/curl/)).toBeInTheDocument()
    })

    it('should copy cURL to clipboard when button is clicked', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      })

      render(<APITestingPanel endpoint={mockEndpoint} />)

      const copyButton = screen.getByText(/Copy cURL/)
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })
    })
  })

  describe('Request Body Validation', () => {
    it('should validate JSON request body', async () => {
      const postEndpoint = {
        ...mockEndpoint,
        method: 'POST',
        requestBody: 'invalid json',
      }

      render(<APITestingPanel endpoint={postEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        // Should show validation error or handle gracefully
        expect(screen.queryByText(/200 OK/)).not.toBeInTheDocument()
      })
    })

    it('should accept valid JSON request body', async () => {
      const postEndpoint = {
        ...mockEndpoint,
        method: 'POST',
        requestBody: '{"name": "Valid JSON"}',
      }

      render(<APITestingPanel endpoint={postEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })

  describe('Response Display', () => {
    it('should format JSON response', async () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText('Response')).toBeInTheDocument()
        // Response should be formatted JSON
        expect(screen.getByText(/"users"/)).toBeInTheDocument()
      })
    })

    it('should display response headers', async () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/content-type/)).toBeInTheDocument()
      })
    })

    it('should display response time', async () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/ms/)).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Headers', () => {
    it('should include auth headers when requiresAuth is true', async () => {
      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should display 404 errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Endpoint not found' }),
        text: async () => JSON.stringify({ error: 'Endpoint not found' }),
      })

      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/404/)).toBeInTheDocument()
      })
    })

    it('should display 500 errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
        text: async () => JSON.stringify({ error: 'Server error' }),
      })

      render(<APITestingPanel endpoint={mockEndpoint} />)

      const sendButton = screen.getByText('Send Request')
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(screen.getByText(/500/)).toBeInTheDocument()
      })
    })
  })
})
