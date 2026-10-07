/**
 * The kind of value that a stepped utility takes: a stop of the spacing scale,
 * a margin (a stop of the spacing scale, or a negative stop), a name of the
 * text scale, or a radius (a name of the radius scale or a stop of the spacing
 * scale).
 *
 * @internal
 */
export type UtilityValue = 'spacing' | 'margin' | 'text' | 'radius'

/**
 * One utility of {@link utilityTable}.
 *
 * @internal
 */
export type UtilityEntry = {
	/** The CSS properties that the utility writes. */
	properties: readonly string[]
	/** The kind of value that the utility takes. */
	value: UtilityValue
	/**
	 * The class group of the same properties in `tailwind-merge`, when it is not
	 * the name of the utility.
	 */
	group?: string
	/**
	 * Whether the utility also has a ring form, which subtracts the 1 px ring of
	 * a kasane surface.
	 */
	ring?: true
}

/**
 * The density utilities: one entry for each stepped utility, such as
 * `density-p-[2,3,4]`. An entry with `ring` also gives the plain ring utility
 * (`p-ring-2`) and the stepped ring utility (`density-p-ring-[2,3,4]`).
 *
 * The plugin of `utilities.ts` registers each utility from this table, and
 * `core/tw-merge.ts` builds its class groups and conflicts from it. So a new
 * utility is one entry, and `cn` merges it with no other change. The table
 * holds data only, so `cn` reads it with no plugin code.
 *
 * @internal
 */
export const utilityTable = {
	p: { properties: ['padding'], value: 'spacing', ring: true },
	px: { properties: ['padding-inline'], value: 'spacing', ring: true },
	py: { properties: ['padding-block'], value: 'spacing', ring: true },
	pt: { properties: ['padding-top'], value: 'spacing' },
	pb: { properties: ['padding-bottom'], value: 'spacing' },
	ps: { properties: ['padding-inline-start'], value: 'spacing', ring: true },
	pe: { properties: ['padding-inline-end'], value: 'spacing', ring: true },
	ms: { properties: ['margin-inline-start'], value: 'spacing', ring: true },
	me: { properties: ['margin-inline-end'], value: 'spacing', ring: true },
	my: { properties: ['margin-block'], value: 'margin' },
	mt: { properties: ['margin-top'], value: 'margin' },
	mb: { properties: ['margin-bottom'], value: 'margin' },
	gap: { properties: ['gap'], value: 'spacing' },
	'gap-x': { properties: ['column-gap'], value: 'spacing' },
	'gap-y': { properties: ['row-gap'], value: 'spacing' },
	size: { properties: ['width', 'height'], value: 'spacing' },
	h: { properties: ['height'], value: 'spacing' },
	'max-h': { properties: ['max-height'], value: 'spacing' },
	w: { properties: ['width'], value: 'spacing' },
	'min-w': { properties: ['min-width'], value: 'spacing' },
	'inset-s': { properties: ['inset-inline-start'], value: 'spacing', group: 'start' },
	text: { properties: ['font-size', 'line-height'], value: 'text', group: 'font-size' },
	rounded: { properties: ['border-radius'], value: 'radius', ring: true },
} as const satisfies Record<string, UtilityEntry>
