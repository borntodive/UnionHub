import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { CarddavService } from "./carddav/carddav.service";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import * as express from "express";
import * as path from "path";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  // Disable ETag to prevent 304 responses on dynamic endpoints
  app.getHttpAdapter().getInstance().set("etag", false);

  // HTTP request logger
  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const start = Date.now();
      res.on("finish", () => {
        const ms = Date.now() - start;
        console.log(
          `[HTTP] ${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`,
        );
      });
      next();
    },
  );

  // Increase JSON payload limit
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Global exception filter — prevents raw stack traces from leaking to clients
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CardDAV — registered BEFORE CORS and global prefix.
  // Must come first so OPTIONS /carddav/* is handled by our handler (which adds
  // DAV: 1, 3, addressbook headers). If CORS middleware runs first it returns
  // 204 without DAV headers and iOS fails with DAAccountValidationDomain 100.
  const carddavService = app.get(CarddavService);
  app.use(
    "/.well-known/carddav",
    (_req: express.Request, res: express.Response) => {
      res.redirect(301, "/carddav/");
    },
  );
  app.use(
    "/carddav",
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      carddavService.handleRequest(req, res, next).catch(next);
    },
  );

  // Enable CORS
  const corsOrigins = configService
    .get<string>("CORS_ORIGIN", "*")
    .split(",")
    .map((origin: string) => origin.trim())
    .filter((origin: string) => origin.length > 0);

  // Temporarily allowing CORS wildcard in production
  // TODO: Remove this and set explicit CORS_ORIGIN before final production deploy

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Allow all origins in development or if wildcard is set
      if (corsOrigins.includes("*")) {
        return callback(null, true);
      }

      // Check if origin is allowed
      if (corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  });

  // Global prefix
  app.setGlobalPrefix("api/v1");

  // Serve uploaded files only to authenticated users (JWT required)
  const uploadsDir =
    process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");
  const jwtSecret = configService.get<string>("JWT_SECRET");

  app.use(
    "/uploads",
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
      }
      try {
        const jwt = require("jsonwebtoken");
        jwt.verify(authHeader.substring(7), jwtSecret);
        next();
      } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
    },
    express.static(uploadsDir),
  );

  const port = configService.get<number>("PORT", 3000);

  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api/v1`);
  console.log(`Environment: ${configService.get("NODE_ENV", "development")}`);
}

bootstrap();
