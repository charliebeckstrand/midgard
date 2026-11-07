import { appConfig, withAuth } from 'auth/config'

// The picks are Mimir's, in asgard, through the gateway.
export default withAuth(appConfig, { gatewayApi: true })
