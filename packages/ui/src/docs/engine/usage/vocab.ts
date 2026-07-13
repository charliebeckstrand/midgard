// Plausible mock values. The synthesizer knows a prop's *shape* but not its
// *meaning*; this module recovers meaning from the field name and the author's
// `domain` so a `string` named `email` reads as an address and one named
// `title` reads as a heading. Pools are deliberately small and hand-picked —
// enough for variety across seeds without a data dependency.

import type { Rng } from './prng'

/** The author-selectable vocabulary domains from `UsageAuthorConfig`. */
export type Domain = 'generic' | 'people' | 'commerce' | 'geo'

type Pool = { labels: string[]; nouns: string[]; names: string[] }

const POOLS: Record<Domain, Pool> = {
	generic: {
		labels: ['Continue', 'Save changes', 'Get started', 'Learn more', 'Dismiss'],
		nouns: ['Dashboard', 'Overview', 'Settings', 'Reports', 'Activity', 'Workspace'],
		names: ['Untitled', 'Draft', 'Example', 'Sample'],
	},
	people: {
		labels: ['Invite', 'Follow', 'Message', 'Connect', 'View profile'],
		nouns: ['Team', 'Members', 'Directory', 'Contacts', 'Roster'],
		names: ['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Katherine Johnson', 'Edsger Dijkstra'],
	},
	commerce: {
		labels: ['Add to cart', 'Checkout', 'Buy now', 'View order', 'Track shipment'],
		nouns: ['Orders', 'Inventory', 'Catalog', 'Storefront', 'Receipts'],
		names: ['Aurora Headphones', 'Nimbus Backpack', 'Solstice Watch', 'Vertex Keyboard'],
	},
	geo: {
		labels: ['View map', 'Set location', 'Get directions', 'Nearby', 'Explore'],
		nouns: ['Regions', 'Territories', 'Districts', 'Routes', 'Landmarks'],
		names: ['Reykjavík', 'Kyoto', 'Nairobi', 'Montevideo', 'Wellington'],
	},
}

/** An action-style label for interactive children (`<Button>Checkout</Button>`). */
export function label(domain: Domain, rng: Rng): string {
	return rng.pick(POOLS[domain].labels)
}

/**
 * A string value keyed off the field name: `email` → an address, `url`/`href`
 * → a link, `name`/`title`/`label` → a proper noun, `id` → a short token,
 * `description`/`text` → a sentence, everything else → a domain noun.
 */
export function fieldString(name: string, domain: Domain, rng: Rng): string {
	const key = name.toLowerCase()

	if (key.includes('email')) return emailFrom(rng.pick(POOLS[domain].names))

	if (key.includes('url') || key.includes('href') || key.includes('link')) {
		return 'https://example.com'
	}

	if (key.includes('id')) return rng.pick(ID_TOKENS)

	if (key.includes('description') || key.includes('summary') || key.includes('text')) {
		return rng.pick(SENTENCES)
	}

	if (key === 'name' || key.includes('title') || key.includes('name') || key.includes('label')) {
		return rng.pick(POOLS[domain].names)
	}

	return rng.pick(POOLS[domain].nouns)
}

/**
 * A number keyed off the field name: money fields get a two-decimal price,
 * `year` a recent year, counts and the like a small integer.
 */
export function fieldNumber(name: string, rng: Rng): number {
	const key = name.toLowerCase()

	if (
		key.includes('price') ||
		key.includes('amount') ||
		key.includes('total') ||
		key.includes('cost')
	) {
		return Math.round((rng.next() * 200 + 5) * 100) / 100
	}

	if (key.includes('year')) return 2020 + rng.int(6)

	return rng.int(20) + 1
}

const ID_TOKENS = ['a1b2c3', 'x9y8z7', 'k4m5n6', 'p7q8r9', 't2u3v4']

const SENTENCES = [
	'A short, illustrative summary of the item.',
	'Placeholder copy generated for this preview.',
	'Details appear here in a real application.',
]

/** `Ada Lovelace` → `ada@example.com`; strips non-letters, lowercases the first token. */
function emailFrom(fullName: string): string {
	const first =
		fullName
			.toLowerCase()
			.split(/\s+/)[0]
			?.replace(/[^a-z]/g, '') ?? 'user'

	return `${first}@example.com`
}
