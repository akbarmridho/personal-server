module.exports = {
  apps: [
    {
      name: "personal-filen",
      script: "./dist/index.js",
      cwd: "./",
      autorestart: false,
      max_memory_restart: "384M",
      min_uptime: 5000,
      max_restarts: 5,
      restart_delay: 2000,
      watch: false,
      ignore_watch: ["node_modules", "logs", ".mastra"],
    },
  ],
};
