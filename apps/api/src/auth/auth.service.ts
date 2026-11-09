import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  async verifyGoogleToken(idToken: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Empty token payload');
    if (!payload.email_verified) throw new UnauthorizedException('Email not verified');

    return {
      googleId: payload.sub!,
      email: payload.email!.toLowerCase(),
      name: payload.name ?? payload.email!,
      image: payload.picture,
    };
  }

  async googleSignIn(idToken: string) {
    const googleUser = await this.verifyGoogleToken(idToken);
    const user = await this.usersService.upsert(googleUser);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { user, token };
  }

  signToken(userId: string, email: string) {
    return this.jwtService.sign({ sub: userId, email });
  }
}
