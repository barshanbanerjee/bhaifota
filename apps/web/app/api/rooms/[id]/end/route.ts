import { NextRequest, NextResponse } from 'next/server';
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

    const isMember = room.participants.some((p) => p.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ message: 'Not a member of this room' }, { status: 403 });
    }

    await prisma.room.update({
      where: { id: room.id },
      data: {
        status: 'COMPLETED',
        revision: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true, status: 'COMPLETED' });
  } catch (err) {
    console.error('[API] End room error:', err);
    return NextResponse.json(
      { message: (err as Error).message || 'Failed to end room' },
      { status: 500 }
    );
  }
}
