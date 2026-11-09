import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { Resend } from 'resend';
import { ROOM_ALPHABET } from '@bhaifota/shared';
import { SiblingRole } from '@prisma/client';
import { authenticateRequest } from '@/lib/serverAuth';
import { prisma } from '@/lib/prisma';

function generateRoomCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes)
    .map((b) => ROOM_ALPHABET[b % 32])
    .join('');
}

function generateInvitationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { creatorRole, invitedEmail } = await req.json();

    if (!creatorRole || (creatorRole !== 'BROTHER' && creatorRole !== 'SISTER')) {
      return NextResponse.json({ message: 'Invalid creator role' }, { status: 400 });
    }

    if (!invitedEmail || typeof invitedEmail !== 'string') {
      return NextResponse.json({ message: 'Invited email is required' }, { status: 400 });
    }

    const cleanInvitedEmail = invitedEmail.trim().toLowerCase();
    if (user.email.toLowerCase() === cleanInvitedEmail) {
      return NextResponse.json({ message: 'Cannot invite yourself' }, { status: 400 });
    }

    const invitedRole: SiblingRole = creatorRole === 'BROTHER' ? 'SISTER' : 'BROTHER';
    const { raw, hash } = generateInvitationToken();

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const invExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Generate unique room code with collision retry
    let code: string = '';
    let attempts = 0;
    do {
      code = generateRoomCode();
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const room = await prisma.room.create({
      data: {
        code,
        expiresAt,
        participants: {
          create: {
            userId: user.id,
            role: creatorRole as SiblingRole,
          },
        },
        invitation: {
          create: {
            creatorId: user.id,
            invitedEmail: cleanInvitedEmail,
            invitedRole,
            tokenHash: hash,
            expiresAt: invExpiresAt,
          },
        },
      },
      include: {
        participants: true,
        invitation: true,
      },
    });

    // Determine base web URL
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.WEB_URL || `${proto}://${host}`;
    const inviteUrl = `${origin}/invite/${raw}`;

    // Dispatch email via Resend if configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail = process.env.EMAIL_FROM || 'Bhaifota <onboarding@resend.dev>';
        await resend.emails.send({
          from: fromEmail,
          to: cleanInvitedEmail,
          subject: `${user.name} wants to celebrate Bhaifota with you`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fdf6f0; border-radius: 16px;">
              <h1 style="color: #c2185b; margin-bottom: 8px;">ভাইফোঁটা</h1>
              <p style="font-size: 18px; color: #1a0a00;"><strong>${user.name}</strong> has invited you to celebrate Bhaifota together.</p>
              <p style="color: #666; line-height: 1.5;">Click the link below to enter your private room and begin the celebration. This link is private to you and expires in 24 hours.</p>
              <div style="margin: 28px 0;">
                <a href="${inviteUrl}" style="display: inline-block; padding: 14px 28px; background: #c2185b; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
                  Join Bhaifota →
                </a>
              </div>
              <p style="font-size: 12px; color: #888;">Direct link: <a href="${inviteUrl}" style="color: #c2185b;">${inviteUrl}</a></p>
              <p style="margin-top: 32px; font-size: 12px; color: #999;">If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('[API] Failed to send email via Resend:', emailErr);
      }
    }

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
      },
      invitedRole,
      inviteUrl,
    });
  } catch (err) {
    console.error('[API] Room creation error:', err);
    return NextResponse.json(
      { message: (err as Error).message || 'Failed to create room' },
      { status: 500 }
    );
  }
}

