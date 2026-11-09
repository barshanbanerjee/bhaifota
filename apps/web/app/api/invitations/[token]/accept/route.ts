import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticateRequest } from '@/lib/serverAuth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json(
      { message: 'Please sign in with Google to accept this invitation' },
      { status: 401 }
    );
  }

  const { token: rawToken } = await params;

  try {
    const hash = createHash('sha256').update(rawToken).digest('hex');

    const invitation = await prisma.roomInvitation.findUnique({
      where: { tokenHash: hash },
      include: {
        room: {
          include: {
            participants: true,
          },
        },
        creator: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ message: 'Invitation not found or invalid' }, { status: 404 });
    }

    // Check if user is already a participant (idempotent entry)
    const existingParticipant = invitation.room.participants.find((p) => p.userId === user.id);
    if (existingParticipant) {
      return NextResponse.json({
        roomId: invitation.roomId,
        participant: existingParticipant,
      });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { message: 'This invitation has already been used or revoked' },
        { status: 403 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.roomInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ message: 'Invitation has expired' }, { status: 403 });
    }

    // Verify authenticated user's email matches the invited email
    if (user.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      return NextResponse.json(
        {
          message: `This invitation was sent to ${invitation.invitedEmail}, but you are signed in as ${user.email}. Please sign in with the invited account.`,
        },
        { status: 403 }
      );
    }

    if (user.id === invitation.creatorId) {
      return NextResponse.json(
        { message: 'You created this invitation and cannot accept it yourself' },
        { status: 403 }
      );
    }

    if (invitation.room.participants.length >= 2) {
      return NextResponse.json({ message: 'This room is already full' }, { status: 403 });
    }

    // Transactional acceptance
    const [, participant] = await prisma.$transaction([
      prisma.roomInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      }),
      prisma.roomParticipant.create({
        data: {
          roomId: invitation.roomId,
          userId: user.id,
          role: invitation.invitedRole,
        },
      }),
      prisma.room.update({
        where: { id: invitation.roomId },
        data: {
          status: 'CONNECTED',
          revision: { increment: 1 },
        },
      }),
    ]);

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const sessionToken = jwt.sign({ sub: user.id, email: user.email }, secret, {
      expiresIn: '7d',
    });

    return NextResponse.json({
      roomId: invitation.roomId,
      participant,
      token: sessionToken,
    });
  } catch (err) {
    console.error('[API] Accept invitation error:', err);
    return NextResponse.json(
      { message: (err as Error).message || 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

