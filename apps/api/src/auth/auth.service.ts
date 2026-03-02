import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './jwt-auth.guard';

const scryptAsync = promisify(scrypt);
const SCRYPT_KEYLEN = 64;
const REFRESH_TOKEN_BYTES = 40;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const password = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password },
      select: { id: true, email: true, createdAt: true },
    });

    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email);
    return { accessToken, refreshToken, user };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.verifyPassword(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email);
    const { password: _pw, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }

  async refresh(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    const { accessToken, refreshToken } = await this.issueTokens(user.id, user.email);
    return { accessToken, refreshToken };
  }

  async logout(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // -------------------------------------------------------------------------

  private async issueTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload);

    const rawRefresh = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
    const days = parseInt(refreshExpiresIn.replace(/\D/g, ''), 10) || 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });

    return { accessToken, refreshToken: rawRefresh };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
    return `${salt}:${hash.toString('hex')}`;
  }

  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, hashHex] = stored.split(':');
    const storedHash = Buffer.from(hashHex, 'hex');
    const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
    return timingSafeEqual(storedHash, derived);
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
