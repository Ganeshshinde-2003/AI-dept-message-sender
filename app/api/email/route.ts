import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing Nodemailer credentials');
      return NextResponse.json({ error: 'Server configuration error: Missing email credentials' }, { status: 500 });
  }

  try {
    const { message, to, subject }: { message: string, to: string, subject: string } = await request.json();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: message,
    });
    
    return NextResponse.json({ success: true });

  } catch (error: unknown) { // **FIX: Type is 'unknown'**
    console.error('Error in /api/email:', error);

    // **FIX: Type-safe error handling**
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ error: `Nodemailer Error: ${errorMessage}` }, { status: 500 });
  }
}
