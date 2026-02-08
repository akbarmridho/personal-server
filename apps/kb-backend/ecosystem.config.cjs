module.exports = {
  apps: [
    {
      name: "kb-backend",
      script: "./dist/index.js",
      cwd: "./",
      autorestart: false,
      max_memory_restart: "2048M",
      min_uptime: 5000,
      max_restarts: 5,
      restart_delay: 2000,
      watch: false,
      ignore_watch: ["node_modules", "logs"],
    },
  ],
};
