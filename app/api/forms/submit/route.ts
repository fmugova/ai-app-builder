import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { siteId, formType, formData } = await request.json();
    
    // Validate
    if (!siteId || !formData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Find project and owner
    const project = await prisma.project.findUnique({
      where: { id: siteId },
      include: { User: true }
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }
    
    // Store submission
    const submission = await prisma.formSubmission.create({
      data: {
        siteId,
        userId: project.userId,
        formType: formType || 'contact',
        data: formData,
        userEmail: formData.email,
      }
    });
    
    // Send email to site owner
    try {
      await resend.emails.send({
        from: 'BuildFlow AI <noreply@buildflow-ai.app>',
        to: project.User.email,
        subject: `New contact form submission from ${project.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Form Submission</h2>
            <p><strong>From:</strong> ${formData.name || 'Anonymous'}</p>
            <p><strong>Email:</strong> ${formData.email || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              ${formData.message || 'No message'}
            </div>
            <p style="margin-top: 30px;">
              <a href="https://buildflow-ai.app/dashboard" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View in Dashboard
              </a>
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This form was submitted from: ${project.name}
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the whole request if email fails
    }
    
    // Optional: Send autoresponder to user
    if (formData.email && formData.name) {
      try {
        await resend.emails.send({
          from: 'BuildFlow AI <noreply@buildflow-ai.app>',
          to: formData.email,
          subject: 'Thank you for your message',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Hi ${formData.name},</p>
              <p>Thank you for contacting us through ${project.name}. We've received your message and will get back to you soon!</p>
              <p>Best regards,<br>${project.name} Team</p>
            </div>
          `
        });
      } catch (autoresponderError) {
        console.error('Failed to send autoresponder:', autoresponderError);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      submissionId: submission.id 
    });
    
  } catch (error) {
    console.error('Form submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit form' }, 
      { status: 500 }
    );
  }
}

// CORS for cross-origin requests from generated sites
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}