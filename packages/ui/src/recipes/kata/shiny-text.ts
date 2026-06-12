import { kokkaku } from '../kiso'

// ShinyText styles itself inline (a motion-driven gradient over plain text),
// so the kata carries only the skeleton silhouette, which tracks text.
export const k = {
	skeleton: kokkaku.text,
} as const
