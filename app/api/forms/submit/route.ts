import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimitByIdentifier } from '@/lib/rate-limit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema
const formSubmitSchema = z.object({
  siteId: z.string().uuid('Invalid site ID'),
  formType: z.string().max(100).optional(),
  formData: z.record(z.string(), z.any()).refine(
    (data) => JSON.stringify(data).length <= 10000,
    { message: 'Form data too large' }
  )
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 per minute per IP (Upstash — survives serverless cold starts)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const rl = await checkRateLimitByIdentifier(`form:${ip}`, 'formSubmit')
    if (!rl.success) {
      const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many form submissions. Please try again later.' },
        { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
      )
    }

    const body = await request.json()
    const validatedData = formSubmitSchema.parse(body);
    const { siteId, formType, formData } = validatedData;
    
    // Find project and get userId
    const project = await prisma.project.findUnique({
      where: { id: siteId },
      select: { 
        id: true,
        userId: true
      }
    })
    
    if (!project) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }
    
    // ✅ Use relation syntax with connect
const submission = await prisma.formSubmission.create({
  data: {
    type: formType || 'contact',  // ✅ Correct field name
    data: formData,
    read: false,  // ✅ Add this required field
    Project: {
      connect: { id: siteId }
    },
    User: {
      connect: { id: project.userId }
    }
  }
})
    
    return NextResponse.json({ 
      success: true, 
      submissionId: submission.id 
    })
    
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: zodError.issues.map(e => e.message) 
        },
        { status: 400 }
      );
    }
    
    console.error('Form submission error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to submit form',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// CORS for cross-origin requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
