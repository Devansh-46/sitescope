// app/api/contact/route.ts
// POST /api/contact — save contact form submission via Supabase

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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

    return NextResponse.json(
      { success: true, message: "Thanks! We'll be in touch within 24 hours." },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}