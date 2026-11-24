import { decodeEntities } from './markdown-entities'

const SAFE_URL_SCHEMES = /^(?:https?|mailto|tel)$/i

/**
 * A lexed URL cleared to render as an `href`/`src`. Relative, root-relative,
 * anchor, and protocol-relative URLs pass through; an absolute URL passes only
 * on a known-safe scheme: http/https/mailto/tel, plus `data:` for images.
 * Untrusted Markdown can carry `javascript:`, `data:text/html`, or `vbscript:`
 * URLs that run script when the link is clicked. Those resolve to `undefined`,
 * and no `href`/`src` renders. Entity references in the URL decode first.
 *
 * @internal
 */
export function safeUrl(source: string, allowData = false): string | undefined {
	// The scheme check reads the decoded URL, so `&#106;avascript:` is blocked
	// as `javascript:`. The decoded URL is also what renders.
	const url = decodeEntities(source)

	// The URL parser strips every leading C0 control and space (code point
	// <= 0x20), plus tab/newline anywhere, when resolving a scheme, so
	// `javascript:` and `java\tscript:` both become `javascript:` at click
	// time. Drop that whole set before classifying the scheme: a `\s` strip
	// misses the non-whitespace C0 controls (U+0000–U+0008, U+000E–U+001F)
	// the browser still trims, so a leading control byte would hide a blocked
	// scheme. The original `url` is what renders; this cleaned copy only
	// classifies.
	const scheme = [...url]
		.filter((char) => char.charCodeAt(0) > 0x20)
		.join('')
		.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]

	// The strip walks the whole URL to read a ~4-character scheme, which is
	// O(payload) on a large `data:` image. Left alone deliberately: the obvious
	// scheme-bounded rewrite drops the leading-whitespace defense and readmits
	// `" javascript:"`, which browsers trim and run. A slow correct guard beats a
	// fast porous one on an uncommon path.
	if (scheme === undefined) return url

	if (allowData && scheme.toLowerCase() === 'data') return url

	return SAFE_URL_SCHEMES.test(scheme) ? url : undefined
}
