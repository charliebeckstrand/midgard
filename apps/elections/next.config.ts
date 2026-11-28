import { appConfig } from 'auth/app-config'

// The app is public and reads civicAPI from its own server, so it has no
// gateway rewrites. `appConfig` gives it the security headers.
export default appConfig
