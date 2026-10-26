import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLIENT_DIR, prerenderedPages } from '../../../scripts/docs-server'

// Each link of the prerendered pages that stays on the site goes to a page of
// the build. A link with a hash goes to an element with that id. A prop of
// the API reference is in a closed entry, which the build does not render,
// so a link to it needs the entry.

// The id of a prop, such as `api-Button-variant`, and the id of its entry,
// such as `api-Button` (`docs/kit/anchors.ts`).
const PROP_ID = /^(api-[^-]+)-./

// The `href` of a link, and the `id` of an element, in the markup of a page.
const HREF = /<a\b[^>]*?\shref="([^"]*)"/g

const ID = /\sid="([^"]*)"/g

/** Reads the attribute values that `pattern` finds in the markup of a page. */
function parseValues(html: string, pattern: RegExp): string[] {
	return [...html.matchAll(pattern)].map(([, value = '']) => value.replaceAll('&amp;', '&'))
}

/** The markup of the prerendered page at each path. */
const markup = new Map(
	prerenderedPages().map((route) => [
		route,
		fs.readFileSync(path.join(CLIENT_DIR, route, 'index.html'), 'utf8'),
	]),
)

/** The ids of the page at each path. */
const ids = new Map([...markup].map(([route, html]) => [route, new Set(parseValues(html, ID))]))

/** Why the link `href` on the page at `from` goes nowhere, or `undefined` when it goes to a page. */
function brokenLink(from: string, href: string): string | undefined {
	const [target = '', hash] = href.split('#')

	const route = target === '' ? from : target.replace(/(.)\/$/, '$1')

	const found = ids.get(route)

	if (!found) return `${href}: no page at ${route}`

	if (hash === undefined || hash === '' || found.has(hash)) return undefined

	const entry = PROP_ID.exec(hash)?.[1]

	if (entry !== undefined && found.has(entry)) return undefined

	return `${href}: no element with the id ${hash} on ${route}`
}

describe('the links of the docs build', () => {
	it('finds the prerendered pages', () => {
		expect(markup.size).toBeGreaterThan(100)
	})

	it('sends each link on the site to a page, and each hash to an element', () => {
		const broken = [...markup].flatMap(([from, html]) =>
			parseValues(html, HREF)
				.filter((href) => href.startsWith('#') || (href.startsWith('/') && !href.startsWith('//')))
				.filter((href) => !href.startsWith('/assets/'))
				.flatMap((href) => {
					const reason = brokenLink(from, href)

					return reason === undefined ? [] : [`${from}: ${reason}`]
				}),
		)

		expect([...new Set(broken)]).toEqual([])
	})
})
