import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import 'dotenv/config';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0',
		allowedHosts: process.env.OAUTH_DOMAIN ? [process.env.OAUTH_DOMAIN] : [],
		watch: {
			// macOS FSEvents (used by chokidar for directory watching) doesn't
			// deliver events in this environment — confirmed with a standalone
			// fsevents.watch() call that loads fine but never fires. Polling
			// sidesteps FSEvents entirely so file changes are actually picked up.
			usePolling: true
		}
	}
});
