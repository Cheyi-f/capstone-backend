
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../lib/config.js";
import { userRepository } from "../repositories/user.repository.js";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function createAccessToken(userId: string, email: string): string {
  const options: SignOptions = {
    subject: userId,
    expiresIn: config.JWT_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>,
  };

  return jwt.sign({ email }, config.JWT_SECRET, options);
}

export const authService = {
  async register(input: {
    email: string;
    password: string;
    fullName?: string;
  }) {
    const email = input.email.trim().toLowerCase();

    const existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
      throw new AuthError("An account with this email already exists.", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await userRepository.create({
      email,
      passwordHash,
      ...(input.fullName?.trim()
        ? { fullName: input.fullName.trim() }
        : {}),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      accessToken: createAccessToken(user.id, user.email),
    };
  },

  async login(input: {
    email: string;
    password: string;
  }) {
    const email = input.email.trim().toLowerCase();

    const user = await userRepository.findByEmail(email);

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AuthError("Invalid email or password.", 401);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      accessToken: createAccessToken(user.id, user.email),
    };
  },
};
