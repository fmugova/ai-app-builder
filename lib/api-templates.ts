// lib/api-templates.ts
// Pre-built templates for common API endpoints

export interface ApiTemplate {
  id: string
  name: string
  displayName: string
  description: string
  category: 'database' | 'forms' | 'webhooks' | 'auth' | 'payments' | 'email' | 'files'
  icon: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  requiresAuth: boolean
  usesDatabase: boolean
  code: string
  configSchema?: Record<string, { type: string; required: boolean; placeholder?: string }>
}

// ============================================================================
// DATABASE TEMPLATES
// ============================================================================

export const DATABASE_TEMPLATES: ApiTemplate[] = [
  {
    id: 'get-all-records',
    name: 'get-all-records',
    displayName: 'Get All Records',
    description: 'Fetch all records from a database table with pagination',
    category: 'database',
    icon: '📋',
    method: 'GET',
    path: '/api/{{tableName}}',
    requiresAuth: false,
    usesDatabase: true,
    code: `// app/api/{{tableName}}/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.{{tableName}}.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.{{tableName}}.count()
    ])

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Error fetching {{tableName}}:', error)
    return NextResponse.json(
      { error: 'Failed to fetch {{tableName}}' },
      { status: 500 }
    )
  }
}`,
    configSchema: {
      tableName: { type: 'string', required: true, placeholder: 'users' }
    }
  },

  {
    id: 'get-single-record',
    name: 'get-single-record',
    displayName: 'Get Single Record',
    description: 'Fetch a single record by ID',
    category: 'database',
    icon: '🔍',
    method: 'GET',
    path: '/api/{{tableName}}/[id]',
    requiresAuth: false,
    usesDatabase: true,
    code: `// app/api/{{tableName}}/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.{{tableName}}.findUnique({
      where: { id: params.id }
    })

    if (!record) {
      return NextResponse.json(
        { error: '{{tableName}} not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(record)
  } catch (error: any) {
    console.error('Error fetching {{tableName}}:', error)
    return NextResponse.json(
      { error: 'Failed to fetch {{tableName}}' },
      { status: 500 }
    )
  }
}`
  },

  {
    id: 'create-record',
    name: 'create-record',
    displayName: 'Create Record',
    description: 'Create a new record in database',
    category: 'database',
    icon: '➕',
    method: 'POST',
    path: '/api/{{tableName}}',
    requiresAuth: true,
    usesDatabase: true,
    code: `// app/api/{{tableName}}/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()

    // Validation
    if (!data.{{requiredField}}) {
      return NextResponse.json(
        { error: '{{requiredField}} is required' },
        { status: 400 }
      )
    }

    const record = await prisma.{{tableName}}.create({
      data: {
        ...data,
        userId: session.user.id
      }
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error: any) {
    console.error('Error creating {{tableName}}:', error)
    return NextResponse.json(
      { error: 'Failed to create {{tableName}}' },
      { status: 500 }
    )
  }
}`,
    configSchema: {
      tableName: { type: 'string', required: true },
      requiredField: { type: 'string', required: true, placeholder: 'name' }
    }
  },

  {
    id: 'update-record',
    name: 'update-record',
    displayName: 'Update Record',
    description: 'Update an existing record',
    category: 'database',
    icon: '✏️',
    method: 'PUT',
    path: '/api/{{tableName}}/[id]',
    requiresAuth: true,
    usesDatabase: true,
    code: `// app/api/{{tableName}}/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()

    // Verify ownership
    const existing = await prisma.{{tableName}}.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: '{{tableName}} not found' },
        { status: 404 }
      )
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.{{tableName}}.update({
      where: { id: params.id },
      data
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating {{tableName}}:', error)
    return NextResponse.json(
      { error: 'Failed to update {{tableName}}' },
      { status: 500 }
    )
  }
}`
  },

  {
    id: 'delete-record',
    name: 'delete-record',
    displayName: 'Delete Record',
    description: 'Delete a record from database',
    category: 'database',
    icon: '🗑️',
    method: 'DELETE',
    path: '/api/{{tableName}}/[id]',
    requiresAuth: true,
    usesDatabase: true,
    code: `// app/api/{{tableName}}/[id]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const existing = await prisma.{{tableName}}.findUnique({
      where: { id: params.id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: '{{tableName}} not found' },
        { status: 404 }
      )
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.{{tableName}}.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting {{tableName}}:', error)
    return NextResponse.json(
      { error: 'Failed to delete {{tableName}}' },
      { status: 500 }
    )
  }
}`
  }
]

// ============================================================================
// FORM HANDLER TEMPLATES
// ============================================================================

export const FORM_TEMPLATES: ApiTemplate[] = [
  {
    id: 'contact-form',
    name: 'contact-form',
    displayName: 'Contact Form Handler',
    description: 'Process contact form submissions and send email',
    category: 'forms',
    icon: '📧',
    method: 'POST',
    path: '/api/contact',
    requiresAuth: false,
    usesDatabase: true,
    code: `// app/api/contact/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json()

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Save to database
    const submission = await prisma.contactSubmission.create({
      data: { name, email, message }
    })

    // Send email notification
    try {
      const { sendEmail, emailTemplates } = await import('@/lib/email-service')
      const template = emailTemplates.contactFormNotification({ name, email, message })
      await sendEmail({
        to: process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || 'admin@example.com',
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: email // Allow direct reply to submitter
      })
    } catch (emailError) {
      console.error('Failed to send contact notification:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon!'
    })
  } catch (error: any) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    )
  }
}`
  },

  {
    id: 'newsletter-signup',
    name: 'newsletter-signup',
    displayName: 'Newsletter Signup',
    description: 'Handle newsletter subscription requests',
    category: 'forms',
    icon: '📰',
    method: 'POST',
    path: '/api/newsletter/subscribe',
    requiresAuth: false,
    usesDatabase: true,
    code: `// app/api/newsletter/subscribe/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json()

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Email already subscribed' },
        { status: 400 }
      )
    }

    // Create subscription
    const subscriber = await prisma.newsletterSubscriber.create({
      data: { email, name, status: 'active' }
    })

    // Send welcome email
    try {
      const { sendEmail, emailTemplates } = await import('@/lib/email-service')
      const template = emailTemplates.newsletterWelcome({ name })
      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text
      })
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to newsletter!'
    })
  } catch (error: any) {
    console.error('Newsletter signup error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}`
  }
]

// ============================================================================
// WEBHOOK TEMPLATES
// ============================================================================

export const WEBHOOK_TEMPLATES: ApiTemplate[] = [
  {
    id: 'stripe-webhook',
    name: 'stripe-webhook',
    displayName: 'Stripe Webhook Handler',
    description: 'Handle Stripe payment webhooks',
    category: 'webhooks',
    icon: '💳',
    method: 'POST',
    path: '/api/webhooks/stripe',
    requiresAuth: false,
    usesDatabase: true,
    code: `// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = headers().get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        // Update order status
        await prisma.order.update({
          where: { stripeSessionId: session.id },
          data: { status: 'paid', paidAt: new Date() }
        })
        break

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment succeeded:', paymentIntent.id)
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent
        console.log('Payment failed:', failedPayment.id)
        break

      default:
        console.log('Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}`
  }
]

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export const EMAIL_TEMPLATES: ApiTemplate[] = [
  {
    id: 'send-email',
    name: 'send-email',
    displayName: 'Send Email',
    description: 'Send transactional emails using Resend',
    category: 'email',
    icon: '✉️',
    method: 'POST',
    path: '/api/email/send',
    requiresAuth: true,
    usesDatabase: false,
    code: `// app/api/email/send/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { to, subject, html } = await req.json()

    // Validation
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to,
      subject,
      html
    })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id
    })
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}`
  }
]

// ============================================================================
// FILE UPLOAD TEMPLATES
// ============================================================================

export const FILE_TEMPLATES: ApiTemplate[] = [
  {
    id: 'upload-file',
    name: 'upload-file',
    displayName: 'File Upload',
    description: 'Handle file uploads with validation',
    category: 'files',
    icon: '📎',
    method: 'POST',
    path: '/api/upload',
    requiresAuth: true,
    usesDatabase: true,
    code: `// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validation
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Max 5MB' },
        { status: 400 }
      )
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = \`\${Date.now()}-\${file.name}\`
    const path = join(process.cwd(), 'public', 'uploads', filename)

    await writeFile(path, buffer)

    // Save to database
    const upload = await prisma.upload.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path: \`/uploads/\${filename}\`,
        userId: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      file: {
        id: upload.id,
        url: \`/uploads/\${filename}\`,
        filename: file.name,
        size: file.size
      }
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}`
  }
]

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const ALL_TEMPLATES = [
  ...DATABASE_TEMPLATES,
  ...FORM_TEMPLATES,
  ...WEBHOOK_TEMPLATES,
  ...EMAIL_TEMPLATES,
  ...FILE_TEMPLATES
]

export const TEMPLATE_CATEGORIES = [
  { id: 'database', name: 'Database', icon: '🗄️', color: 'blue' },
  { id: 'forms', name: 'Forms', icon: '📝', color: 'green' },
  { id: 'webhooks', name: 'Webhooks', icon: '🔗', color: 'purple' },
  { id: 'email', name: 'Email', icon: '📧', color: 'red' },
  { id: 'files', name: 'Files', icon: '📁', color: 'yellow' },
  { id: 'auth', name: 'Authentication', icon: '🔐', color: 'indigo' },
  { id: 'payments', name: 'Payments', icon: '💰', color: 'emerald' }
]

// Helper: Replace template variables
export function processTemplate(template: string, variables: Record<string, string>): string {
  let processed = template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    processed = processed.replace(regex, value)
  }
  return processed
}
