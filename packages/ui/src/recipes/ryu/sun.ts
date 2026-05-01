/**
 * Sun (寸) — Size system.
 *
 * The spine of the recipe system. Each step bundles every property that scales
 * together — text + leading, padding, gap, inner radius, icon size — as
 * structural token references into the substrate scales. Consumers (kata for
 * classnames, <Concentric> for CSS variables) derive whatever shape they need
 * from the same source of truth.
 *
 * Every field names a Tailwind 4 theme token. No classnames, no var() strings,
 * no parallel `*Token` fields. Promoting a step's radius from `lg` to `xl` is
 * one edit; both kata classnames and <Concentric>'s outer-radius calc track
 * automatically.
 *
 * Concentric formula (consumed by <Concentric>):
 *   outer-radius = inner-radius + padding
 *
 * Layer: ryū · Concern: size
 */

import { ji } from './ji'

export const steps = ['sm', 'md', 'lg'] as const
export type Step = (typeof steps)[number]

export type SunStep = {
	/** Key into `ji.size` — bundles font-size + line-height. */
	text: 'sm' | 'md' | 'lg'
	/** Tailwind spacing token (numeric) for padding. */
	space: '2' | '3' | '4'
	/** Tailwind spacing token (numeric) for gap between children. */
	gap: '1' | '2' | '3'
	/** Key into `maru.rounded` — the inner radius. <Concentric> derives outer = inner + padding. */
	radius: 'sm' | 'md' | 'lg'
	/** Tailwind size token for `data-slot="icon"` children. */
	icon: '4' | '5' | '6'
}

export const sun = {
	sm: { text: 'sm', space: '2', gap: '1', radius: 'sm', icon: '4' },
	md: { text: 'md', space: '3', gap: '2', radius: 'md', icon: '5' },
	lg: { text: 'lg', space: '4', gap: '3', radius: 'lg', icon: '6' },
} as const satisfies Record<Step, SunStep>

/**
 * Resolve a sun step into Tailwind class fragments. A kata's `size` variant
 * spreads whichever fields it needs into its `tv()` base.
 *
 * Centralizing the derivation here means sun's structural data and the
 * resulting classnames stay in lockstep: promoting `sun.md.radius` from `'lg'`
 * to `'xl'` flows into every consumer's rendered class without further edits.
 *
 * Text+leading is delegated to `ji.size`, which already bundles them as a
 * single class (e.g. `'text-base/6'`). Other fields are template-stringed
 * against the matching Tailwind utility namespace — `p-*`, `gap-*`,
 * `rounded-*`, and the `data-slot="icon"` size selector.
 */
export function classes(step: Step) {
	const s = sun[step]

	return {
		text: ji.size[s.text],
		padding: `p-${s.space}`,
		gap: `gap-${s.gap}`,
		rounded: `rounded-${s.radius}`,
		icon: `*:data-[slot=icon]:size-${s.icon} *:data-[slot=icon]:shrink-0`,
	}
}
