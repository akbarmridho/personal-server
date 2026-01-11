module.exports = {
  apps: [
    {
      name: "ai-frontend",
      script: "npx",
      args: "serve -s build/client -l 8023",
      cwd: "./",
      autorestart: false,
      max_memory_restart: "1024M",
      min_uptime: 5000,
      max_restarts: 5,
      restart_delay: 2000,
      watch: false,
      ignore_watch: ["node_modules", "logs", "build", ".react-router"],
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
