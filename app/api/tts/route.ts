import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');
  const voice = searchParams.get('voice');
  const lang = voice || searchParams.get('lang') || 'zh-CN';

  if (!text || !text.trim()) {
    return new NextResponse('Missing text', { status: 400 });
  }

  try {
    const trimmed = text.trim().slice(0, 600);
    const encodedText = encodeURIComponent(trimmed);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodedText}`;

    const res = await fetch(ttsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
        'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return new NextResponse(`TTS upstream error: ${res.status}`, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal TTS Error';
    return new NextResponse(message, { status: 500 });
  }
}
