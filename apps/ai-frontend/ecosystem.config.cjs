module.exports = {
  apps: [
    {
      name: "ai-frontend",
      script: "./build/server/index.js",
      cwd: "./",
      autorestart: false,
      max_memory_restart: "1024M",
      min_uptime: 5000,
      max_restarts: 5,
      restart_delay: 2000,
      watch: false,
      ignore_watch: ["node_modules", "logs", "build", ".react-router"],
      env: {
        PORT: 8023,
        NODE_ENV: "production",
      },
    },
  ],
};
