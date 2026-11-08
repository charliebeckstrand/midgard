import { appConfig, securityHeaders } from 'auth/app-config'

// The app is public and reads civicAPI from its own server, so it has no
// gateway rewrites. It sends the security headers that `withAuth` sends in
// the other apps.
export default {
	...appConfig,
	async headers() {
		return [{ source: '/:path*', headers: securityHeaders }]
	},
}
