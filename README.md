# ATProto SvelteKit Template


OAuth already figured out for you, a minimal template with ease of use oauth confidential client and local development. Along with a demo how to use the logged-in client. This is just a starting point, it's up to you to build the application.

## Features
- OAuth client configured from `.env` variables
  - `DEV=true` allows local development, do not need a public url
  - removing `DEV=true` and setting `OAUTH_DOMAIN` is production and requires a public url like [demo.atpoke.xyz](https://demo.atpoke.xyz)
  - Setting `OAUTH_JWK` allows for the confidential client that lasts much longer (forever if you refresh the tokens, 180 for indivudal refresh tokens). Can get a value for it from running `node ./bin/gen-jwk.js`
- Server side sessions and automatic loading of the atproto client from `event.locals.atpAgent` on server side components.
- Examples on how to create atproto records with [pokes or making a Bluesky post](./src/routes/demo/+page.server.ts)
- Examples showing how to use [microcosm.blue](https://microcosm.blue/) tooling for an appview like experince without the appview.
  - See how many people and who [have poked](./src/routes/demo/+page.svelte) you with [constellation](https://constellation.microcosm.blue/)
  - Find the [handles from the did](./src/routes/demo/+page.svelte) easily with [slingshot](https://slingshot.microcosm.blue/)

## Dev Setup
1. Copy [.env.example](.env.example) to [.env](.env), .env.example is dev settings
2. `pnpm install`
3. May need to run `pnpm approve-builds` for the build scripts for sqlite
4. `pnpm run dev` or `pnpm run dev:logging` with [pino-pretty](https://github.com/pinojs/pino-pretty) for pretty logging

> If you are running locally on a different port than `5173` or something else odd can set `OAUTH_DOMAIN` .env to the domain and port. Just make sure to use either `127.0.0.1` or `[::1]`(ipv6) for oauth to work for local development.

## Production

> Sign up for Railway with my referral code [z49xDi](https://railway.com?referralCode=z49xDi) to get $20 in credits, and if you spend anything, I get 15% in credits. 

### Railway
1. Install the railway cli ([directions here](https://docs.railway.com/guides/cli#installing-the-cli))
2. Login with `railway login`
3. Create a new project with `railway init`, set your project name
4. Deploy your webapp with `railway up`, this will create a new deployment. This will crash on the first run since we still have some changes to make. This is what uploads your code to railway. That is expected since we don't have a volume and our variables yet.
![crash](.tangled/images/crash.png)
5. `railway service` select the service you deployed earlier, name is most likely the same as the project name.
6. Run `railway volume add -m /app_data` to create a persistent volume for the sqlite database.
7. If you do not already have your project dashboard open you can open it with `railway open`, this opens it in a web browser.
8. Click on your service, then Variables. Add the following variables:
  * `OAUTH_DOMAIN` - your domain name
  * `OAUTH_JWK` - the value from `node ./bin/gen-jwk.js`
  * `DATABASE_URL` - `/app_data/local.db`
![railway dashboard](.tangled/images/railway-dashboard.png)
9. Go to settings and select "Custom Domain" to add your domain name. Follow the directions there
![railway custom domain](.tangled/images/railway-custom-domain.png)

And then to update your project going forward you can run `railway up` again.

### Local server like a VPS
1. [Install docker](https://docs.docker.com/engine/install/)
2. Copy [.env.example](.env.example) to [.env](.env) and fill in the variables. Make sure to remove `DEV=true`
3. `docker-compose up`

> The docker compose comes with Caddy, if you have another reverse proxy you can remove it from the docker compose and just reverse proxy to port 3000.
> You may also have to play around with the Caddyfile depending on your setup.
