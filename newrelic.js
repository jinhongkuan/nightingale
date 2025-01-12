export default {
	app_name: ['Nightingale'],
	license_key: 'a8f36a7d4605fbe91703e0e791dfa925FFFFNRAL',
	logging: {
		level: 'info'
	},
	allow_all_headers: true,
	attributes: {
		exclude: [
			'request.headers.cookie',
			'request.headers.authorization',
			'request.headers.proxyAuthorization',
			'request.headers.setCookie*',
			'request.headers.x*',
			'response.headers.cookie',
			'response.headers.authorization',
			'response.headers.proxyAuthorization',
			'response.headers.setCookie*',
			'response.headers.x*'
		]
	}
}; 