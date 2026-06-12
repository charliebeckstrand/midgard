import { type Ma, ma } from '../kiso'

/** `Flex` / `Stack` read gap tokens from here rather than kiso directly. */
export const k = {
	gap: { 0: 'gap-0', ...ma.gap } satisfies Record<Ma | 0, string>,
}
