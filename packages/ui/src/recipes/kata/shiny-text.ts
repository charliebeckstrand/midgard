import { kokkaku } from '../kiso'

// ShinyText styles itself inline (a gradient over plain text, which a CSS
// animation moves), so the kata carries only the skeleton silhouette: the base
// line of text.
// ShinyText is a `<span>`, so the silhouette is inline too: a `<div>` in a `<p>`,
// a `<button>`, or an `<a>` is not valid HTML. An empty inline-block has no
// width, so `w-full` keeps the line of the block silhouette, to the same cap.
export const k = {
	skeleton: { base: [kokkaku.text.base, 'w-full'], inline: true },
} as const
