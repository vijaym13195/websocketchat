import { PrismaClient, User } from "../../generated/prisma";

export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  lastLoginAt?: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

const prisma = new PrismaClient();

export async function createUser(userData: CreateUserData): Promise<User> {
  try {
    return await prisma.user.create({
      data: userData,
    });
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      throw new Error("Email already exists");
    }
    throw new Error("Failed to create user");
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { email },
    });
  } catch (error) {
    throw new Error("Failed to find user by email");
  }
}

export async function findUserById(id: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { id },
    });
  } catch (error) {
    throw new Error("Failed to find user by ID");
  }
}

export async function updateUser(
  id: string,
  userData: UpdateUserData
): Promise<User> {
  try {
    return await prisma.user.update({
      where: { id },
      data: userData,
    });
  } catch (error: any) {
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      throw new Error("Email already exists");
    }
    if (error.code === "P2025") {
      throw new Error("User not found");
    }
    throw new Error("Failed to update user");
  }
}

export async function updateUserPassword(
  id: string,
  hashedPassword: string
): Promise<User> {
  try {
    return await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("User not found");
    }
    throw new Error("Failed to update user password");
  }
}

export async function deleteUser(id: string): Promise<void> {
  try {
    await prisma.user.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("User not found");
    }
    throw new Error("Failed to delete user");
  }
}

export async function userExists(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user !== null;
  } catch (error) {
    throw new Error("Failed to check if user exists");
  }
}

export async function updateLastLogin(id: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  } catch (error) {
    throw new Error("Failed to update last login");
  }
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function getUsersCount(): Promise<number> {
  try {
    return await prisma.user.count();
  } catch (error) {
    throw new Error("Failed to get users count");
  }
}

export async function deactivateUser(id: string): Promise<User> {
  try {
    return await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("User not found");
    }
    throw new Error("Failed to deactivate user");
  }
}

export async function activateUser(id: string): Promise<User> {
  try {
    return await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new Error("User not found");
    }
    throw new Error("Failed to activate user");
  }
}
