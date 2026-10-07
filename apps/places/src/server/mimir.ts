import { createGatewayClient } from 'auth'
import type { paths } from 'shared/mimir'

/**
 * The typed client of Mimir on the server, through the gateway. It forwards the
 * session cookies of the request, so the page reads the data of its user.
 */
export const mimir = createGatewayClient<paths>()
