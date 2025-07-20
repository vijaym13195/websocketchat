import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "./PasswordService";
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
} from "./TokenService";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  toPublicUser,
  userExists,
  PublicUser,
} from "../repositories/UserRepository";

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export async function register(data: RegisterData): Promise<AuthResult> {
  const { email, password, firstName, lastName } = data;

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    throw new Error(
      `Password validation failed: ${passwordValidation.errors.join(", ")}`
    );
  }

  // Check if user already exists
  const existingUser = await userExists(email);
  if (existingUser) {
    throw new Error("Email already registered");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await createUser({
    email,
    password: hashedPassword,
    firstName,
    lastName,
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken();

  // Store refresh token
  await storeRefreshToken(user.id, refreshToken);

  // Update last login
  await updateLastLogin(user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function login(data: LoginData): Promise<AuthResult> {
  const { email, password } = data;

  // Find user by email
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken();

  // Store refresh token
  await storeRefreshToken(user.id, refreshToken);

  // Update last login
  await updateLastLogin(user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(refreshToken: string): Promise<AuthResult> {
  // Validate refresh token
  const tokenData = await validateRefreshToken(refreshToken);

  // Find user
  const user = await findUserById(tokenData.userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }

  // Generate new tokens
  const accessToken = generateAccessToken(user.id, user.email);
  const newRefreshToken = await rotateRefreshToken(refreshToken, user.id);

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await revokeRefreshToken(refreshToken);
  } catch (error) {
    // If token doesn't exist or is already revoked, that's fine
    // We don't want to throw an error for logout
  }
}

export async function logoutAll(userId: string): Promise<void> {
  await revokeAllUserTokens(userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Find user
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(
    currentPassword,
    user.password
  );
  if (!isCurrentPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error(
      `Password validation failed: ${passwordValidation.errors.join(", ")}`
    );
  }

  // Hash new password
  const hashedNewPassword = await hashPassword(newPassword);

  // Update password in database
  const { updateUserPassword } = await import("../repositories/UserRepository");
  await updateUserPassword(userId, hashedNewPassword);

  // Revoke all existing refresh tokens for security
  await revokeAllUserTokens(userId);
}

export async function validateUserToken(token: string): Promise<PublicUser> {
  const { verifyAccessToken } = await import("./TokenService");

  // Verify the access token
  const payload = await verifyAccessToken(token);

  // Find user
  const user = await findUserById(payload.userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }

  return toPublicUser(user);
}

export async function getUserProfile(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return toPublicUser(user);
}
