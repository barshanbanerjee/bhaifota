import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ message: 'Missing idToken' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const client = new OAuth2Client(clientId);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email_verified) {
      return NextResponse.json({ message: 'Unverified email address' }, { status: 401 });
    }

    const email = payload.email!.toLowerCase();
    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        email,
        name: payload.name || email,
        image: payload.picture,
      },
      create: {
        googleId: payload.sub,
        email,
        name: payload.name || email,
        image: payload.picture,
      },
    });

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign({ sub: user.id, email: user.email }, secret, {
      expiresIn: '7d',
    });

    const res = NextResponse.json({ user, token });
    res.cookies.set('bhaifota_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('Google Auth Error:', err);
    return NextResponse.json({ message: (err as Error).message }, { status: 401 });
  }
}
