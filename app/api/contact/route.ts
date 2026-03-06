// app/api/contact/route.ts
// POST /api/contact — save contact form submission via Supabase and send email via Resend

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  website: z.string().url().optional().or(z.literal('')),
  message: z.string().max(2000).optional(),
  reportId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { name, email, website, message, reportId } = parsed.data;

    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase.from('contact_submissions').insert({
      name,
      email,
      website: website || null,
      message: message || null,
      report_id: reportId || null,
    });

    if (error) throw new Error(error.message);

    // Send email via Resend
    try {
      await resend.emails.send({
        from: 'SiteScope <onboarding@resend.dev>',
        to: 'plain.n.pixel@gmail.com',
        subject: `New Expert Report Request: ${name}`,
        html: `
          <h1>New Expert Report Request</h1>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Website:</strong> ${website || 'N/A'}</p>
          <p><strong>Report ID:</strong> ${reportId || 'N/A'}</p>
          <p><strong>Message:</strong> ${message || 'N/A'}</p>
        `,
      });
    } catch (emailError) {
      console.error('[API/Contact] Email failed:', emailError);
      // We don't fail the whole request if email fails, as DB record is saved
    }

    return NextResponse.json(
      { success: true, message: `Thanks ${name}! We've received your request for an expert report and will reach out within 24 hours.` },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API/Contact] Submission failed:', error);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}