module.exports = {
  apps: [
    {
      name: 'kenya-pos-api',
      script: './server/src/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      node_args: '--experimental-modules',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      max_memory_restart: '500M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
