
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ message: 'Missing filename' }, { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error("Erro detalhado no upload para o Vercel Blob:", error);
    return NextResponse.json({ message: 'Error uploading file', error: error.message }, { status: 500 });
  }
}
