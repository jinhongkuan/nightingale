import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		fs: {
			allow: ['..']
		}
	},
	define: {
		'process.env.NEW_RELIC_APP_NAME': process.env.NEW_RELIC_APP_NAME,
		'process.env.NEW_RELIC_LICENSE_KEY': process.env.NEW_RELIC_LICENSE_KEY
	},
	optimizeDeps: {
		include: ['newrelic']
	}
});
