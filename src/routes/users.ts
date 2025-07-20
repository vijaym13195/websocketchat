import { Router, Request, Response } from "express";
import { requireAuth, requireOwnership } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validation";
import {
  updateProfileSchema,
  changePasswordSchema,
  userIdSchema,
} from "../validation/schemas";
import {
  getUserProfile,
  changePassword,
} from "../services/AuthenticationService";
import {
  updateUser,
  deleteUser,
  toPublicUser,
} from "../repositories/UserRepository";

const router = Router();

// GET /api/users/profile - Get current user's profile
router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await getUserProfile(userId);

    res.json({
      success: true,
      data: { user },
      message: "Profile retrieved successfully",
    });
  } catch (error: any) {
    if (error.message.includes("User not found")) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User profile not found",
        },
      });
    }

    console.error("Get profile error:", error);
    res.status(500).json({
      error: {
        code: "PROFILE_FETCH_FAILED",
        message: "Failed to retrieve user profile",
      },
    });
  }
});

// PUT /api/users/profile - Update current user's profile
router.put(
  "/profile",
  requireAuth,
  validateBody(updateProfileSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const updateData = req.body;

      // Update user profile
      const updatedUser = await updateUser(userId, updateData);
      const publicUser = toPublicUser(updatedUser);

      res.json({
        success: true,
        data: { user: publicUser },
        message: "Profile updated successfully",
      });
    } catch (error: any) {
      if (error.message.includes("User not found")) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      if (error.message.includes("Email already exists")) {
        return res.status(409).json({
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "Email address is already in use",
          },
        });
      }

      console.error("Update profile error:", error);
      res.status(500).json({
        error: {
          code: "PROFILE_UPDATE_FAILED",
          message: "Failed to update user profile",
        },
      });
    }
  }
);

// PUT /api/users/password - Change current user's password
router.put(
  "/password",
  requireAuth,
  validateBody(changePasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      await changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error: any) {
      if (error.message.includes("User not found")) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      if (error.message.includes("Current password is incorrect")) {
        return res.status(400).json({
          error: {
            code: "INCORRECT_PASSWORD",
            message: "Current password is incorrect",
          },
        });
      }

      if (error.message.includes("Password validation failed")) {
        return res.status(400).json({
          error: {
            code: "WEAK_PASSWORD",
            message: error.message,
          },
        });
      }

      console.error("Change password error:", error);
      res.status(500).json({
        error: {
          code: "PASSWORD_CHANGE_FAILED",
          message: "Failed to change password",
        },
      });
    }
  }
);

// DELETE /api/users/account - Delete current user's account
router.delete("/account", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Delete user account
    await deleteUser(userId);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    if (error.message.includes("User not found")) {
      return res.status(404).json({
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    console.error("Delete account error:", error);
    res.status(500).json({
      error: {
        code: "ACCOUNT_DELETE_FAILED",
        message: "Failed to delete account",
      },
    });
  }
});

// GET /api/users/:id - Get user profile by ID (public endpoint with limited info)
router.get(
  "/:id",
  validateParams(userIdSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const user = await getUserProfile(userId);

      // Return limited public information
      const publicInfo = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      };

      res.json({
        success: true,
        data: { user: publicInfo },
        message: "User information retrieved successfully",
      });
    } catch (error: any) {
      if (error.message.includes("User not found")) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      console.error("Get user by ID error:", error);
      res.status(500).json({
        error: {
          code: "USER_FETCH_FAILED",
          message: "Failed to retrieve user information",
        },
      });
    }
  }
);

// PUT /api/users/:id - Update user profile by ID (admin only or self)
router.put(
  "/:id",
  requireAuth,
  validateParams(userIdSchema),
  validateBody(updateProfileSchema),
  async (req: Request, res: Response) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user!.id;

      // Check if user is updating their own profile
      if (currentUserId !== targetUserId) {
        // In the future, we could check for admin role here
        return res.status(403).json({
          error: {
            code: "ACCESS_DENIED",
            message: "You can only update your own profile",
          },
        });
      }

      const updateData = req.body;
      const updatedUser = await updateUser(targetUserId, updateData);
      const publicUser = toPublicUser(updatedUser);

      res.json({
        success: true,
        data: { user: publicUser },
        message: "User profile updated successfully",
      });
    } catch (error: any) {
      if (error.message.includes("User not found")) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      if (error.message.includes("Email already exists")) {
        return res.status(409).json({
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "Email address is already in use",
          },
        });
      }

      console.error("Update user by ID error:", error);
      res.status(500).json({
        error: {
          code: "USER_UPDATE_FAILED",
          message: "Failed to update user profile",
        },
      });
    }
  }
);

// DELETE /api/users/:id - Delete user by ID (admin only or self)
router.delete(
  "/:id",
  requireAuth,
  validateParams(userIdSchema),
  async (req: Request, res: Response) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user!.id;

      // Check if user is deleting their own account
      if (currentUserId !== targetUserId) {
        // In the future, we could check for admin role here
        return res.status(403).json({
          error: {
            code: "ACCESS_DENIED",
            message: "You can only delete your own account",
          },
        });
      }

      await deleteUser(targetUserId);

      res.json({
        success: true,
        message: "User account deleted successfully",
      });
    } catch (error: any) {
      if (error.message.includes("User not found")) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        });
      }

      console.error("Delete user by ID error:", error);
      res.status(500).json({
        error: {
          code: "USER_DELETE_FAILED",
          message: "Failed to delete user account",
        },
      });
    }
  }
);

export default router;
