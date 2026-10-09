/**
 * Name of the session cookie.
 *
 * @internal
 * @remarks
 * The gateway sets the session with the `__Host-` prefix. The browser then sends
 * it only over HTTPS, and a sibling subdomain cannot set it.
 */
export const sessionCookie = '__Host-session'
