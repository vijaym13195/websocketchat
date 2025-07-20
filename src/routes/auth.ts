import { Router, Request, Response } from "express";
import { validateBody } from "../middleware/validation";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../validation/schemas";
import {
  register,
  login,
  refreshTokens,
  logout,
  logoutAll,
} from "../services/AuthenticationService";

const router = Router();

// POST /api/auth/register
router.post(
  "/register",
  validateBody(registerSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await register(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: "User registered successfully",
      });
    } catch (error: any) {
      if (error.message.includes("Email already registered")) {
        return res.status(409).json({
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "An account with this email already exists",
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

      console.error("Registration error:", error);
      res.status(500).json({
        error: {
          code: "REGISTRATION_FAILED",
          message: "Failed to register user",
        },
      });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await login(req.body);

      res.json({
        success: true,
        data: result,
        message: "Login successful",
      });
    } catch (error: any) {
      if (error.message.includes("Invalid credentials")) {
        return res.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      if (error.message.includes("Account is deactivated")) {
        return res.status(403).json({
          error: {
            code: "ACCOUNT_DEACTIVATED",
            message: "Your account has been deactivated",
          },
        });
      }

      console.error("Login error:", error);
      res.status(500).json({
        error: {
          code: "LOGIN_FAILED",
          message: "Failed to login",
        },
      });
    }
  }
);

// POST /api/auth/refresh
router.post(
  "/refresh",
  validateBody(refreshTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const result = await refreshTokens(req.body.refreshToken);

      res.json({
        success: true,
        data: result,
        message: "Tokens refreshed successfully",
      });
    } catch (error: any) {
      if (
        error.message.includes("Invalid refresh token") ||
        error.message.includes("Token expired") ||
        error.message.includes("Token has been revoked")
      ) {
        return res.status(401).json({
          error: {
            code: "INVALID_REFRESH_TOKEN",
            message: "Invalid or expired refresh token",
          },
        });
      }

      if (error.message.includes("Account is deactivated")) {
        return res.status(403).json({
          error: {
            code: "ACCOUNT_DEACTIVATED",
            message: "Your account has been deactivated",
          },
        });
      }

      console.error("Token refresh error:", error);
      res.status(500).json({
        error: {
          code: "TOKEN_REFRESH_FAILED",
          message: "Failed to refresh tokens",
        },
      });
    }
  }
);

// POST /api/auth/logout
router.post(
  "/logout",
  validateBody(refreshTokenSchema),
  async (req: Request, res: Response) => {
    try {
      await logout(req.body.refreshToken);

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      // Even if logout fails, we should return success
      // The client should clear their tokens regardless
      console.error("Logout error:", error);
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    }
  }
);

// POST /api/auth/logout-all
router.post("/logout-all", async (req: Request, res: Response) => {
  try {
    // This endpoint requires authentication, so we need the user ID
    // We'll get this from the auth middleware when we implement it
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    await logoutAll(userId);

    res.json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  } catch (error: any) {
    console.error("Logout all error:", error);
    res.status(500).json({
      error: {
        code: "LOGOUT_ALL_FAILED",
        message: "Failed to logout from all devices",
      },
    });
  }
});

// GET /api/auth/me (for testing authentication)
router.get("/me", async (req: Request, res: Response) => {
  try {
    // This endpoint requires authentication
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    res.json({
      success: true,
      data: { user },
      message: "User information retrieved successfully",
    });
  } catch (error: any) {
    console.error("Get user info error:", error);
    res.status(500).json({
      error: {
        code: "USER_INFO_FAILED",
        message: "Failed to retrieve user information",
      },
    });
  }
});

export default router;
