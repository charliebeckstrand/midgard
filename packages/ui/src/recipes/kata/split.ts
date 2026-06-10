import { ma } from '../kiso'

/**
 * Split recipe surface. Exposes the named gap scale (`ma.gap`); `Split`
 * reads gap tokens from here rather than kiso directly.
 */
export const k = {
	gap: ma.gap,
}
