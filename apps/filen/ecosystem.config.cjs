module.exports = {
  apps: [
    {
      name: "personal-filen",
      script: "./dist/index.js",
      cwd: "./",
      autorestart: true,
      max_memory_restart: "2048M",
      min_uptime: 5000,
      max_restarts: 5,
      restart_delay: 2000,
      watch: false,
      ignore_watch: ["node_modules", "logs", ".mastra"],
      combine_logs: true,
      time: true,
      // 20.00 UTC is 03.00 WIB
      cron_restart: "0 20 */3 * *",
    },
  ],
};
