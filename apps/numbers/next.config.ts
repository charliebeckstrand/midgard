import { appConfig, withAuth } from 'auth/config'

// Sign-in is optional. The stats of a signed-in reader are Mimir's, in asgard,
// through the gateway.
export default withAuth(appConfig, { gatewayApi: true })
