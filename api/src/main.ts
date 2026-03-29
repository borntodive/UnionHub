import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
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
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

  // Enable CORS
  const corsOrigins = configService
    .get<string>("CORS_ORIGIN", "*")
    .split(",")
    .map((origin: string) => origin.trim())
    .filter((origin: string) => origin.length > 0);

  if (
    configService.get("NODE_ENV") === "production" &&
    corsOrigins.includes("*")
  ) {
    throw new Error(
      "CORS wildcard (*) is not allowed in production. Set CORS_ORIGIN in .env.",
    );
  }

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

  // Serve static files from persistent uploads directory.
  // UPLOAD_BASE_DIR must point to a path outside the deploy folder on the server
  // (e.g. /var/www/unionhub-uploads) so files survive Cleavr deployments.
  const uploadsDir =
    process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsDir));

  const port = configService.get<number>("PORT", 3000);

  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api/v1`);
  console.log(`Environment: ${configService.get("NODE_ENV", "development")}`);
}

bootstrap();
