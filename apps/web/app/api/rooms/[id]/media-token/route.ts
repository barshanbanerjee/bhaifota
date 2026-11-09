import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { authenticateRequest } from '@/lib/serverAuth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const room = await prisma.room.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        participants: true,
      },
    });

    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    const participant = room.participants.find((p) => p.userId === user.id);
    if (!participant) {
      return NextResponse.json({ message: 'Not a member of this room' }, { status: 403 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { message: 'LiveKit API key or secret not configured on server' },
        { status: 500 }
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: user.name || user.email,
      ttl: '2h',
    });

    token.addGrant({
      roomJoin: true,
      room: `bhaifota_${room.id}`,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwtToken = await token.toJwt();

    return NextResponse.json({
      token: jwtToken,
      roomName: `bhaifota_${room.id}`,
    });
  } catch (err) {
    console.error('[API] Media token generation error:', err);
    return NextResponse.json(
      { message: (err as Error).message || 'Failed to generate media token' },
      { status: 500 }
    );
  }
}

