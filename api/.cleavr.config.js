module.exports = {
  apps: [
    {
      name: "api.unionhub.app",
      script: "./dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        // Database
        DB_HOST: "localhost",
        DB_PORT: 5432,
        DB_USERNAME: "postgres",
        DB_PASSWORD: "password",
        DB_DATABASE: "unionconnect",

        // JWT
        JWT_SECRET: "your-super-secret-jwt-key-change-this-in-production",
        JWT_ACCESS_EXPIRATION: "15m",
        JWT_REFRESH_EXPIRATION: "30d",

        // Application
        PORT: 3000,
        NODE_ENV: "production",

        // Admin
        DEFAULT_ADMIN_CREWCODE: "SUPERADMIN",
        DEFAULT_ADMIN_PASSWORD: "changeme",

        // CORS
        CORS_ORIGIN: "http://localhost:8081",

        // Rate Limiting
        THROTTLE_TTL: 60,
        THROTTLE_LIMIT: 10,

        // Ollama
        OLLAMA_URL: "http://localhost:11434",
        OLLAMA_MODEL: "kimi-k2.5:cloud",
      },
    },
  ],
};
