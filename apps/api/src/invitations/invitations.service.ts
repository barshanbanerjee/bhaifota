import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { randomBytes, createHash } from 'crypto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class InvitationsService {
  private readonly resend: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  generateToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    return { raw, hash };
  }

  async sendInvitationEmail(invitedEmail: string, creatorName: string, rawToken: string) {
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000');
    const inviteUrl = `${webUrl}/invite/${rawToken}`;
    const fromEmail = this.config.get<string>('EMAIL_FROM') || 'Bhaifota <onboarding@resend.dev>';
    console.log(`[InvitationsService] Dispatching invitation to ${invitedEmail} via ${fromEmail}...`);

    try {
      const response = await this.resend.emails.send({
        from: fromEmail,
        to: invitedEmail,
        subject: `${creatorName} wants to celebrate Bhaifota with you`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fdf6f0; border-radius: 16px;">
            <h1 style="color: #c2185b; margin-bottom: 8px;">ভাইফোঁটা</h1>
            <p style="font-size: 18px; color: #1a0a00;"><strong>${creatorName}</strong> has invited you to celebrate Bhaifota together.</p>
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

      if (response.error) {
        console.error('[InvitationsService] Resend API error:', response.error);
      } else {
        console.log('[InvitationsService] Resend email sent successfully! Message ID:', response.data?.id);
      }
    } catch (err) {
      console.error('[InvitationsService] Email send failed:', err);
    }
  }

  async sendInvitation(roomId: string, invitedEmail: string, creatorName: string) {
    const { raw, hash } = this.generateToken();
    const expiresAt = new Date(Date.now() + this.config.get<number>('INVITATION_EXPIRY_HOURS', 24) * 60 * 60 * 1000);

    await this.prisma.roomInvitation.update({
      where: { roomId },
      data: { tokenHash: hash, expiresAt },
    });

    await this.sendInvitationEmail(invitedEmail, creatorName, raw);
    return { raw };
  }

  async accept(rawToken: string, userId: string) {
    const hash = createHash('sha256').update(rawToken).digest('hex');

    const invitation = await this.prisma.roomInvitation.findUnique({
      where: { tokenHash: hash },
      include: { room: { include: { participants: true } }, creator: true },
    });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'PENDING') throw new ForbiddenException('Invitation already used or revoked');
    if (invitation.expiresAt < new Date()) {
      await this.prisma.roomInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
      throw new ForbiddenException('Invitation has expired');
    }

    // Verify the authenticated user's email matches the invited email
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');
    if (user.email.toLowerCase() !== invitation.invitedEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }
    if (user.id === invitation.creatorId) {
      throw new ForbiddenException('Creator cannot accept their own invitation');
    }

    // Check room participant slots
    if (invitation.room.participants.length >= 2) {
      throw new ForbiddenException('Room is already full');
    }

    // Transactional redemption
    const [, participant] = await this.prisma.$transaction([
      this.prisma.roomInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
      this.prisma.roomParticipant.create({
        data: {
          roomId: invitation.roomId,
          userId,
          role: invitation.invitedRole,
        },
      }),
      this.prisma.room.update({
        where: { id: invitation.roomId },
        data: { status: 'CONNECTED', revision: { increment: 1 } },
      }),
    ]);

    const token = this.authService.signToken(userId, user.email);
    return { roomId: invitation.roomId, participant, token };
  }
}
