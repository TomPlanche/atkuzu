// pm2 config for atkuzu: the SvelteKit site and the daily-grid scheduler,
// grouped under the "atkuzu" namespace so both can be managed together
// (pm2 restart/stop/delete atkuzu). package.json has "type": "module", so
// this file stays .cjs for pm2's require()-based config loading.
module.exports = {
  apps: [
    {
      name: "site",
      namespace: "atkuzu",
      // adapter-node build output (`pnpm build`); doesn't read .env on its own.
      script: "build/index.js",
      cwd: __dirname,
      node_args: ["-r", "dotenv/config"],
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "3001"
      }
    },
    {
      name: "daily-scheduler",
      namespace: "atkuzu",
      script: "scripts/schedule-daily.ts",
      interpreter: "node_modules/.bin/tsx",
      cwd: __dirname,
      autorestart: true,
      watch: false
    }
  ]
};
