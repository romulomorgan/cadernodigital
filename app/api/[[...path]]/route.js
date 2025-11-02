import { NextResponse } from 'next/server';

export async function GET(request) {
  return NextResponse.json({ 
    status: 'API em restauração',
    message: 'Aplicando patches da FASE 1'
  });
}

export async function POST(request) {
  return NextResponse.json({ 
    status: 'API em restauração',
    message: 'Aplicando patches da FASE 1'
  });
}
