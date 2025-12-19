module.exports = {
  apps: [
    {
      name: "trilium-mcp",
      script: "./build/index.js",
      cwd: "./",
      autorestart: false,
      max_memory_restart: "512M",
      min_uptime: 5000,
      max_restarts: 5,
      restart_delay: 2000,
      watch: false,
    },
  ],
};
