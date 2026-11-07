import { appConfig, withAuth } from 'auth/config'

// The places and the visits are Mimir's, in asgard, through the gateway.
export default withAuth(appConfig, { gatewayApi: true })
