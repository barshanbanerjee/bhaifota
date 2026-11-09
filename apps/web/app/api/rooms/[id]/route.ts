import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const room = await prisma.room.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        invitation: true,
      },
    });

    if (!room) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: room.id,
      code: room.code,
      status: room.status,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      participants: room.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        joinedAt: p.joinedAt,
        name: p.user.name,
        email: p.user.email,
        image: p.user.image,
      })),
      invitation: room.invitation
        ? {
            id: room.invitation.id,
            invitedEmail: room.invitation.invitedEmail,
            invitedRole: room.invitation.invitedRole,
            status: room.invitation.status,
            expiresAt: room.invitation.expiresAt,
          }
        : null,
    });
  } catch (err) {
    console.error('[API] Fetch room error:', err);
    return NextResponse.json(
      { message: (err as Error).message || 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

