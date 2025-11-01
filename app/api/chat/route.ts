import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import type { Borrower, Message } from '@/app/lib/types';

interface ChatRequest {
  message: string;
  borrower: Borrower;
  history: Message[];
}

export async function POST(request: NextRequest) {
  if (!process.env.GOOGLE_API_KEY) {
    console.error('Missing GOOGLE_API_KEY environment variable');
    return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
  }

  try {
    const { message, borrower, history }: ChatRequest = await request.json();
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Using the stable model

    const typedHistory: Content[] = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const chatHistoryForModel = typedHistory.slice(0, -1);
    const chat = model.startChat({ history: chatHistoryForModel });
    const prompt = `You are a friendly and empathetic debt collection agent. Help the borrower, ${borrower.name}, understand their outstanding amount of $${borrower.outstandingAmount}. The user's latest message is: "${message}"`;

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ reply: text });

  } catch (error: unknown) { // **FIX: Type is 'unknown'**
    console.error('Error in /api/chat:', error);
    
    // **FIX: Type-safe error handling**
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({ error: `Gemini API Error: ${errorMessage}` }, { status: 500 });
  }
}
