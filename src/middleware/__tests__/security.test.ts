import { Request, Response, NextFunction } from "express";
import {
  requestSizeLimit,
  sanitizeInput,
  securityHeaders,
  ipWhitelist,
  requireApiKey,
  validateContentType,
  addRequestId,
} from "../security";

describe("Security Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      get: jest.fn(),
      body: {},
      query: {},
      params: {},
      method: "POST",
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" } as any,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      removeHeader: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("requestSizeLimit", () => {
    it("should allow requests within size limit", () => {
      (mockReq.get as jest.Mock).mockReturnValue("1000"); // 1KB
      const middleware = requestSizeLimit("10mb");

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should reject requests exceeding size limit", () => {
      (mockReq.get as jest.Mock).mockReturnValue("20971520"); // 20MB
      const middleware = requestSizeLimit("10mb");

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request size exceeds limit of 10mb",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should continue when no content-length header", () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);
      const middleware = requestSizeLimit("10mb");

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("sanitizeInput", () => {
    it("should sanitize request body", () => {
      mockReq.body = {
        name: '  John<script>alert("xss")</script>  ',
        email: "test@example.com",
        nested: {
          value: '<img src="x" onerror="alert(1)">',
        },
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({
        name: "John",
        email: "test@example.com",
        nested: {
          value: "",
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should sanitize query parameters", () => {
      mockReq.query = {
        search: '  <script>alert("xss")</script>  ',
        page: "1",
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query).toEqual({
        search: "",
        page: "1",
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should sanitize URL parameters", () => {
      mockReq.params = {
        id: "  user<script>  ",
        category: "normal",
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.params).toEqual({
        id: "user",
        category: "normal",
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle arrays in request data", () => {
      mockReq.body = {
        tags: [
          "<script>alert(1)</script>",
          "normal-tag",
          "javascript:alert(1)",
        ],
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({
        tags: ["", "normal-tag", ""],
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it("should remove javascript protocols and event handlers", () => {
      mockReq.body = {
        url: "javascript:alert(1)",
        onclick: "onclick=alert(1)",
        onload: "onload=malicious()",
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body).toEqual({
        url: "",
        onclick: "",
        onload: "",
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("securityHeaders", () => {
    it("should set security headers", () => {
      (mockReq as any).secure = true;

      securityHeaders(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.removeHeader).toHaveBeenCalledWith("X-Powered-By");
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-Content-Type-Options",
        "nosniff"
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-XSS-Protection",
        "1; mode=block"
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()"
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should set HSTS header for X-Forwarded-Proto https", () => {
      (mockReq.get as jest.Mock).mockReturnValue("https");

      securityHeaders(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should not set HSTS header for non-HTTPS requests", () => {
      (mockReq as any).secure = false;
      (mockReq.get as jest.Mock).mockReturnValue("http");

      securityHeaders(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).not.toHaveBeenCalledWith(
        "Strict-Transport-Security",
        expect.any(String)
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("ipWhitelist", () => {
    it("should allow requests from whitelisted IPs", () => {
      (mockReq as any).ip = "192.168.1.1";
      const middleware = ipWhitelist(["192.168.1.1", "10.0.0.1"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should reject requests from non-whitelisted IPs", () => {
      (mockReq as any).ip = "192.168.1.100";
      const middleware = ipWhitelist(["192.168.1.1", "10.0.0.1"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "IP_NOT_ALLOWED",
          message: "Your IP address is not allowed to access this resource",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should allow all requests when no whitelist is configured", () => {
      (mockReq as any).ip = "192.168.1.100";
      const middleware = ipWhitelist([]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should use connection.remoteAddress as fallback", () => {
      (mockReq as any).ip = undefined;
      mockReq.connection = { remoteAddress: "192.168.1.1" } as any;
      const middleware = ipWhitelist(["192.168.1.1"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("requireApiKey", () => {
    beforeEach(() => {
      process.env.API_KEYS = "key1,key2,key3";
    });

    afterEach(() => {
      delete process.env.API_KEYS;
    });

    it("should allow requests with valid API key", () => {
      (mockReq.get as jest.Mock).mockReturnValue("key1");

      requireApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should reject requests with invalid API key", () => {
      (mockReq.get as jest.Mock).mockReturnValue("invalid-key");

      requireApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "INVALID_API_KEY",
          message: "Valid API key is required",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject requests without API key", () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      requireApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "INVALID_API_KEY",
          message: "Valid API key is required",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should skip validation when no API keys are configured", () => {
      delete process.env.API_KEYS;
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      requireApiKey(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("validateContentType", () => {
    it("should allow requests with valid content type", () => {
      (mockReq.get as jest.Mock).mockReturnValue("application/json");
      const middleware = validateContentType(["application/json"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should reject requests with invalid content type", () => {
      (mockReq.get as jest.Mock).mockReturnValue("text/plain");
      const middleware = validateContentType(["application/json"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Content-Type must be one of: application/json",
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should reject requests without content type for POST requests", () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);
      const middleware = validateContentType(["application/json"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should skip validation for GET requests", () => {
      mockReq.method = "GET";
      (mockReq.get as jest.Mock).mockReturnValue(undefined);
      const middleware = validateContentType(["application/json"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should skip validation for DELETE requests", () => {
      mockReq.method = "DELETE";
      (mockReq.get as jest.Mock).mockReturnValue(undefined);
      const middleware = validateContentType(["application/json"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("should validate PUT requests", () => {
      mockReq.method = "PUT";
      (mockReq.get as jest.Mock).mockReturnValue(undefined);
      const middleware = validateContentType(["application/json"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should validate PATCH requests", () => {
      mockReq.method = "PATCH";
      (mockReq.get as jest.Mock).mockReturnValue(undefined);
      const middleware = validateContentType(["application/json"]);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("addRequestId", () => {
    it("should use existing X-Request-ID header", () => {
      const existingId = "existing-request-id";
      (mockReq.get as jest.Mock).mockReturnValue(existingId);

      addRequestId(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).requestId).toBe(existingId);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-Request-ID",
        existingId
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should generate new request ID when none exists", () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      addRequestId(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "X-Request-ID",
        (mockReq as any).requestId
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
