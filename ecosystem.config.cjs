module.exports = {
  apps: [
    {
      name: "act4lab",
      script: "server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        ADMIN_USER: "admin",
        ADMIN_PASSWORD: "replace-with-a-strong-password",
        SESSION_SECRET: "replace-with-a-long-random-secret",
      },
    },
  ],
};
