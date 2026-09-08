// pm2 config for atkuzu's SvelteKit site, under the "atkuzu" namespace (pm2
// restart/stop/delete atkuzu). package.json has "type": "module", so this
// file stays .cjs for pm2's require()-based config loading.
//
// The daily-grid scheduler used to live here too (a node-schedule process,
// idling almost 24h a day just to fire one shell chain at midnight Paris
// time), but that's pure overhead pm2 was carrying just to keep a cron timer
// alive. It's been ported to vps-cron (github.com/tomplanche/vps-cron, a
// small Rust cron manager already running other jobs on this VPS): see its
// jobs.toml for the "atkuzu-daily" entry, which does the same generate +
// build + `pm2 restart atkuzu` chain on the same Europe/Paris midnight
// schedule, DST included.
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
    }
  ]
};
