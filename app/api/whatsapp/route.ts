import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.error('Missing Twilio credentials');
    return NextResponse.json({ error: 'Server configuration error: Missing Twilio credentials' }, { status: 500 });
  }

  try {
    const { message, to }: { message: string, to: string } = await request.json();
    const client = twilio(accountSid, authToken);

    // **ADD THIS LOGIC!**
    const MAX_WHATSAPP_LENGTH = 1600;
    let safeMessage = message;
    if (message.length > MAX_WHATSAPP_LENGTH) {
      safeMessage = message.slice(0, MAX_WHATSAPP_LENGTH - 3) + '...';
    }

    await client.messages.create({
      body: safeMessage,                     // USE TRUNCATED MESSAGE
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `whatsapp:${to}`
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error in /api/whatsapp:', error);

    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: `Twilio API Error: ${errorMessage}` }, { status: 500 });
  }
}
