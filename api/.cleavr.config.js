const path = require("path");

module.exports = {
  apps: [
    {
      name: "api.unionhub.app",
      script: path.join(__dirname, "dist/main.js"),
      instances: 1,
      exec_mode: "fork",
      env: {
        DB_HOST: "localhost",
        DB_PORT: 5432,
        DB_USERNAME: "postgres",
        DB_PASSWORD: "password",
        DB_DATABASE: "unionconnect",
        JWT_SECRET:
          "7g3KpXwQm9NvL2RsY8hT5jF4cA6bE1dZ+uW0oP3iM7nKqVxJ2ySfGtHlCeBrD4a",
        JWT_ACCESS_EXPIRATION: "15m",
        JWT_REFRESH_EXPIRATION: "30d",
        PORT: 3000,
        NODE_ENV: "production",
        DEFAULT_ADMIN_CREWCODE: "SUPERADMIN",
        DEFAULT_ADMIN_PASSWORD: "changeme",
        CORS_ORIGIN: "http://localhost:8081",
        THROTTLE_TTL: 60,
        THROTTLE_LIMIT: 10,
        OLLAMA_URL: "http://localhost:11434",
        OLLAMA_MODEL: "kimi-k2.5:cloud",
      },
    },
  ],
};
