/**
 * Kumi (組) — Assembly.
 *
 * Gap scale used by `<Flex>` / `<Stack>` / `<Split>` and a handful of kata
 * size variants. Direction / alignment / justification utilities used to
 * live here too — they were 1:1 aliases of Tailwind classes (`flex-row`,
 * `items-center`, `justify-between`) so consumers now write Tailwind
 * directly. The maps that remained needed for type-derivation were inlined
 * into the relevant component's `variants.ts`.
 *
 * Tier: 1 · Concern: layout gap
 */

export const kumi = {
	gap: {
		0: 'gap-0',
		0.25: 'gap-0.25',
		0.5: 'gap-0.5',
		0.75: 'gap-0.75',
		1: 'gap-1',
		1.25: 'gap-1.25',
		1.5: 'gap-1.5',
		1.75: 'gap-1.75',
		2: 'gap-2',
		2.5: 'gap-2.5',
		3: 'gap-3',
		4: 'gap-4',
		5: 'gap-5',
		6: 'gap-6',
		8: 'gap-8',
		10: 'gap-10',
		12: 'gap-12',
		16: 'gap-16',
		xs: 'gap-0.5',
		sm: 'gap-1',
		md: 'gap-2',
		lg: 'gap-3',
		base: 'gap-4',
	},
} as const
