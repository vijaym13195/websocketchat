import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

// Rate limiting configurations
export const authRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "5"), // 5 attempts per window
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts, please try again later",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by IP and email (if provided)
    const email = req.body?.email || "";
    return `${req.ip}:${email}`;
  },
  skip: (req: Request) => {
    // Skip rate limiting for successful requests in development
    return process.env.NODE_ENV === "development" && req.method === "GET";
  },
});

export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests, please try again later",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests to this endpoint, please try again later",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "X-API-Key",
  ],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
  maxAge: 86400, // 24 hours
};

// Helmet security configuration
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
};

// Request size limiting middleware
export function requestSizeLimit(maxSize: string = "10mb") {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get("content-length");

    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);

      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Request size exceeds limit of ${maxSize}`,
          },
        });
      }
    }

    next();
  };
}

// Parse size string to bytes
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  if (!match) {
    throw new Error("Invalid size format");
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || "b";

  return Math.floor(value * units[unit]);
}

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize params
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }

  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return obj
      .trim()
      .replace(/[<>]/g, "") // Remove potential XSS characters
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, ""); // Remove event handlers
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names too
      const sanitizedKey = key.replace(/[<>]/g, "");
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Security headers middleware
export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Remove server information
  res.removeHeader("X-Powered-By");

  // Add security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // Add HSTS header for HTTPS
  if (req.secure || req.get("X-Forwarded-Proto") === "https") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  next();
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  // Add request ID to request object
  (req as any).requestId = requestId;

  // Log request
  console.log(
    `[${new Date().toISOString()}] ${requestId} ${req.method} ${req.url} - ${
      req.ip
    }`
  );

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${requestId} ${
        res.statusCode
      } - ${duration}ms`
    );
  });

  next();
}

// IP whitelist middleware
export function ipWhitelist(allowedIPs: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured, allow all
    }

    const clientIP = req.ip || req.connection.remoteAddress || "";

    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: {
          code: "IP_NOT_ALLOWED",
          message: "Your IP address is not allowed to access this resource",
        },
      });
    }

    next();
  };
}

// API key validation middleware
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.get("X-API-Key");
  const validApiKeys = process.env.API_KEYS?.split(",") || [];

  if (validApiKeys.length === 0) {
    return next(); // No API keys configured, skip validation
  }

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      error: {
        code: "INVALID_API_KEY",
        message: "Valid API key is required",
      },
    });
  }

  next();
}

// Slow down middleware for brute force protection
export function slowDown(delayAfter: number = 5, delayMs: number = 500) {
  const attempts = new Map<string, number>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip;
    const currentAttempts = attempts.get(key) || 0;

    if (currentAttempts >= delayAfter) {
      const delay = Math.min(
        delayMs * Math.pow(2, currentAttempts - delayAfter),
        10000
      );

      setTimeout(() => {
        attempts.set(key, currentAttempts + 1);
        next();
      }, delay);
    } else {
      attempts.set(key, currentAttempts + 1);
      next();
    }

    // Clean up old attempts every hour
    if (Math.random() < 0.01) {
      attempts.clear();
    }
  };
}

// Content type validation middleware
export function validateContentType(
  allowedTypes: string[] = ["application/json"]
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const contentType = req.get("content-type");

      if (
        !contentType ||
        !allowedTypes.some((type) => contentType.includes(type))
      ) {
        return res.status(415).json({
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: `Content-Type must be one of: ${allowedTypes.join(", ")}`,
          },
        });
      }
    }

    next();
  };
}

// Request ID middleware
export function addRequestId(req: Request, res: Response, next: NextFunction) {
  const requestId =
    req.get("X-Request-ID") ||
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  (req as any).requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
}

// Security middleware stack
export function setupSecurity(app: any) {
  // Basic security headers
  app.use(helmet(helmetOptions));

  // CORS
  app.use(cors(corsOptions));

  // Request ID
  app.use(addRequestId);

  // Request logging
  if (process.env.NODE_ENV !== "test") {
    app.use(requestLogger);
  }

  // Security headers
  app.use(securityHeaders);

  // Input sanitization
  app.use(sanitizeInput);

  // Content type validation
  app.use(validateContentType());

  // Request size limiting
  app.use(requestSizeLimit("10mb"));

  // General rate limiting
  app.use(generalRateLimit);
}
