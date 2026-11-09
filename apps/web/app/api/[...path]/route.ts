import { NextRequest, NextResponse } from 'next/server';

async function proxyToInternalApi(req: NextRequest) {
  // Read internal service binding injected by Vercel
  const internalApiBase = process.env.API_URL || 'http://localhost:4000';
  const targetUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, internalApiBase);

  // Forward incoming headers (filtering out connection/host hop-by-hop headers)
  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'host' && lower !== 'content-length' && lower !== 'connection') {
      forwardHeaders.set(key, value);
    }
  });

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.arrayBuffer() : undefined;

  try {
    const res = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        responseHeaders.append(key, value);
      } else {
        responseHeaders.set(key, value);
      }
    });

    const resBody = await res.arrayBuffer();
    return new NextResponse(resBody, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[Internal API Proxy Error] Failed to proxy to ${targetUrl}:`, err);
    return NextResponse.json(
      { message: `Internal API service unavailable: ${(err as Error).message}` },
      { status: 502 }
    );
  }
}

export const GET = proxyToInternalApi;
export const POST = proxyToInternalApi;
export const PUT = proxyToInternalApi;
export const PATCH = proxyToInternalApi;
export const DELETE = proxyToInternalApi;
export const OPTIONS = proxyToInternalApi;
export const HEAD = proxyToInternalApi;

