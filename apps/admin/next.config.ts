import { appConfig, withAuth } from 'auth/config'

export default withAuth(appConfig, { gatewayApi: true })
