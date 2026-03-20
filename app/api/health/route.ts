import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ version: 'bafa3db', ok: true });
}
