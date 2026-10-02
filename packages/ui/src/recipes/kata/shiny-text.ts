import { kokkaku } from '../kiso'

// ShinyText styles itself inline (a motion-driven gradient over plain text),
// so the kata carries only the skeleton silhouette: the base line of text.
export const k = {
	skeleton: { base: kokkaku.text.base },
} as const
