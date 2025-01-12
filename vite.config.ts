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
		'process.env.NEW_RELIC_APP_NAME': JSON.stringify('Nightingale'),
		'process.env.NEW_RELIC_LICENSE_KEY': JSON.stringify('a8f36a7d4605fbe91703e0e791dfa925FFFFNRAL')
	},
	optimizeDeps: {
		include: ['newrelic']
	}
});
