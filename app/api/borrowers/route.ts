import { NextResponse } from 'next/server';
import borrowers from '../../../data/borrowers.json';
import type { Borrower } from '@/app/lib/types';

export async function GET() {
  return NextResponse.json(borrowers as Borrower[]);
}
