import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'signal-market-watchlist-secret-key-change-in-production'
);

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static async signToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);
  }

  public static async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      return verified.payload as unknown as TokenPayload;
    } catch {
      return null;
    }
  }
}
