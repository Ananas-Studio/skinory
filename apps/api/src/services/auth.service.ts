import { Transaction } from "sequelize";
import { sequelize } from "../config/database.js";
import { getModels } from "../models/index.js";
import { AUTH_PROVIDERS } from "../models/db-types.js";

const AUTH_PROVIDER_SET = new Set<string>(AUTH_PROVIDERS);

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export interface AuthIdentityPayload {
  provider: AuthProvider;
  providerUserId: string;
  idToken: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ServiceUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  authProvider: AuthProvider | null;
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ServiceAuthIdentity {
  id: string;
  provider: AuthProvider;
  providerUserId: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeResult {
  user: ServiceUser;
  connections: ServiceAuthIdentity[];
}

export class AuthServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function isValidProvider(provider: string): provider is AuthProvider {
  return AUTH_PROVIDER_SET.has(provider);
}

function requireNonEmpty(value: string, fieldName: string): void {
  if (!value.trim()) {
    throw new AuthServiceError("AUTH_VALIDATION_FAILED", 400, `${fieldName} is required`);
  }
}

function mapUser(user: {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  authProvider: AuthProvider | null;
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ServiceUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
    isGuest: user.isGuest,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function mapIdentity(identity: {
  id: string;
  provider: AuthProvider;
  providerUserId: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ServiceAuthIdentity {
  return {
    id: identity.id,
    provider: identity.provider,
    providerUserId: identity.providerUserId,
    email: identity.email,
    createdAt: identity.createdAt,
    updatedAt: identity.updatedAt,
  };
}

function normalizePayload(input: {
  provider: string;
  providerUserId: string;
  idToken: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
}): AuthIdentityPayload {
  if (!isValidProvider(input.provider)) {
    throw new AuthServiceError("AUTH_INVALID_PROVIDER", 400, "provider must be google or apple");
  }

  requireNonEmpty(input.providerUserId, "providerUserId");
  requireNonEmpty(input.idToken, "idToken");

  return {
    provider: input.provider,
    providerUserId: input.providerUserId.trim(),
    idToken: input.idToken.trim(),
    email: input.email?.trim() || undefined,
    fullName: input.fullName?.trim() || undefined,
    avatarUrl: input.avatarUrl?.trim() || undefined,
    accessToken: input.accessToken?.trim() || undefined,
    refreshToken: input.refreshToken?.trim() || undefined,
  };
}

// idToken is only checked for presence here; provider signature verification should be added in a dedicated adapter.
export async function signInWithProvider(input: {
  provider: string;
  providerUserId: string;
  idToken: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
}): Promise<MeResult> {
  const payload = normalizePayload(input);
  const { User, AuthIdentity } = getModels();

  return sequelize.transaction(async (transaction) => {
    const existingIdentity = await AuthIdentity.findOne({
      where: {
        provider: payload.provider,
        providerUserId: payload.providerUserId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existingIdentity) {
      await existingIdentity.update(
        {
          email: payload.email ?? existingIdentity.email,
          accessToken: payload.accessToken ?? existingIdentity.accessToken,
          refreshToken: payload.refreshToken ?? existingIdentity.refreshToken,
        },
        { transaction }
      );

      const user = await User.findByPk(existingIdentity.userId, { transaction });
      if (!user) {
        throw new AuthServiceError("AUTH_USER_NOT_FOUND", 404, "linked user not found");
      }

      if (payload.email && user.email !== payload.email) {
        user.email = payload.email;
      }
      if (payload.fullName) {
        user.fullName = payload.fullName;
      }
      if (payload.avatarUrl) {
        user.avatarUrl = payload.avatarUrl;
      }
      if (user.authProvider !== payload.provider) {
        user.authProvider = payload.provider;
      }
      if (user.isGuest) {
        user.isGuest = false;
      }
      await user.save({ transaction });

      const connections = await AuthIdentity.findAll({
        where: { userId: user.id },
        order: [["createdAt", "ASC"]],
        transaction,
      });

      return {
        user: mapUser(user),
        connections: connections.map((item) => mapIdentity(item)),
      };
    }

    const userByEmail = payload.email
      ? await User.findOne({ where: { email: payload.email }, transaction, lock: transaction.LOCK.UPDATE })
      : null;

    const user =
      userByEmail ??
      (await User.create(
        {
          email: payload.email ?? null,
          fullName: payload.fullName ?? null,
          avatarUrl: payload.avatarUrl ?? null,
          authProvider: payload.provider,
          isGuest: false,
        },
        { transaction }
      ));

    if (!userByEmail) {
      user.authProvider = payload.provider;
    }
    if (payload.fullName) {
      user.fullName = payload.fullName;
    }
    if (payload.avatarUrl) {
      user.avatarUrl = payload.avatarUrl;
    }
    if (payload.email && user.email !== payload.email) {
      user.email = payload.email;
    }
    if (user.isGuest) {
      user.isGuest = false;
    }
    await user.save({ transaction });

    try {
      await AuthIdentity.create(
        {
          userId: user.id,
          provider: payload.provider,
          providerUserId: payload.providerUserId,
          email: payload.email ?? null,
          accessToken: payload.accessToken ?? null,
          refreshToken: payload.refreshToken ?? null,
        },
        { transaction }
      );
    } catch {
      throw new AuthServiceError("AUTH_IDENTITY_CONFLICT", 409, "provider identity already linked");
    }

    const connections = await AuthIdentity.findAll({
      where: { userId: user.id },
      order: [["createdAt", "ASC"]],
      transaction,
    });

    return {
      user: mapUser(user),
      connections: connections.map((item) => mapIdentity(item)),
    };
  });
}

export async function getMe(userId: string): Promise<MeResult> {
  const { User, AuthIdentity } = getModels();

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AuthServiceError("AUTH_USER_NOT_FOUND", 404, "user not found");
  }

  const connections = await AuthIdentity.findAll({
    where: { userId },
    order: [["createdAt", "ASC"]],
  });

  return {
    user: mapUser(user),
    connections: connections.map((item) => mapIdentity(item)),
  };
}

export async function signOut(userId: string): Promise<{ signedOut: true }> {
  const { User, AuthIdentity } = getModels();

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AuthServiceError("AUTH_USER_NOT_FOUND", 404, "user not found");
  }

  await AuthIdentity.update(
    {
      accessToken: null,
      refreshToken: null,
    },
    {
      where: { userId },
    }
  );

  return { signedOut: true };
}

export async function listConnections(userId: string): Promise<{ connections: ServiceAuthIdentity[] }> {
  const { User, AuthIdentity } = getModels();

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AuthServiceError("AUTH_USER_NOT_FOUND", 404, "user not found");
  }

  const connections = await AuthIdentity.findAll({
    where: { userId },
    order: [["createdAt", "ASC"]],
  });

  return {
    connections: connections.map((item) => mapIdentity(item)),
  };
}

export async function addConnection(
  userId: string,
  input: {
    provider: string;
    providerUserId: string;
    idToken: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
  }
): Promise<{ connection: ServiceAuthIdentity }> {
  const payload = normalizePayload(input);
  const { User, AuthIdentity } = getModels();

  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) {
      throw new AuthServiceError("AUTH_USER_NOT_FOUND", 404, "user not found");
    }

    const existingProvider = await AuthIdentity.findOne({
      where: { userId, provider: payload.provider },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existingProvider) {
      throw new AuthServiceError("AUTH_CONNECTION_ALREADY_EXISTS", 409, "connection already exists for provider");
    }

    const identityOwner = await AuthIdentity.findOne({
      where: {
        provider: payload.provider,
        providerUserId: payload.providerUserId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (identityOwner) {
      throw new AuthServiceError("AUTH_IDENTITY_CONFLICT", 409, "identity already linked to another account");
    }

    const identity = await AuthIdentity.create(
      {
        userId,
        provider: payload.provider,
        providerUserId: payload.providerUserId,
        email: payload.email ?? null,
        accessToken: payload.accessToken ?? null,
        refreshToken: payload.refreshToken ?? null,
      },
      { transaction }
    );

    if (user.authProvider === null) {
      user.authProvider = payload.provider;
      await user.save({ transaction });
    }

    return {
      connection: mapIdentity(identity),
    };
  });
}

export async function removeConnection(
  userId: string,
  provider: string
): Promise<{ removedProvider: AuthProvider }> {
  if (!isValidProvider(provider)) {
    throw new AuthServiceError("AUTH_INVALID_PROVIDER", 400, "provider must be google or apple");
  }

  const { User, AuthIdentity } = getModels();

  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) {
      throw new AuthServiceError("AUTH_USER_NOT_FOUND", 404, "user not found");
    }

    const connections = await AuthIdentity.findAll({
      where: { userId },
      order: [["createdAt", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const target = connections.find((item) => item.provider === provider);
    if (!target) {
      throw new AuthServiceError("AUTH_CONNECTION_NOT_FOUND", 404, "connection not found");
    }

    if (connections.length === 1) {
      throw new AuthServiceError("AUTH_LAST_CONNECTION", 409, "cannot remove last auth connection");
    }

    await target.destroy({ transaction });

    if (user.authProvider === provider) {
      const nextConnection = connections.find((item) => item.provider !== provider) ?? null;
      user.authProvider = nextConnection?.provider ?? null;
      await user.save({ transaction });
    }

    return {
      removedProvider: provider,
    };
  });
}

export function toPublicError(error: unknown): AuthServiceError {
  if (error instanceof AuthServiceError) {
    return error;
  }

  console.log(error);
  

  return new AuthServiceError("INTERNAL_SERVER_ERROR", 500, "Unexpected server error");
}
