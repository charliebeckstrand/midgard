/**
 * Sun (寸) — Size system.
 *
 * The spine of the recipe system. Each step bundles every property that scales
 * together — text + leading, padding, gap, inner radius, icon size — as
 * structural token references into the substrate scales.
 *
 * Sun stores *data*, not classnames. Tailwind's scanner only sees literal
 * strings, so dynamic `` `p-${step.space}` `` would silently miss generation.
 * Consumers translate sun's tokens into static utilities at the call site
 * via density-keyed maps.
 *
 * Layer: ryū · Concern: size
 */

export const steps = ['sm', 'md', 'lg'] as const

export type Step = (typeof steps)[number]

export type SunStep = {
	/** Key into `ji.size` — bundles font-size + line-height. */
	text: 'sm' | 'md' | 'lg'
	/** Tailwind spacing token (numeric) for padding. */
	space: '2' | '3' | '4'
	/** Tailwind spacing token (numeric) for gap between children. */
	gap: '1' | '2' | '3'
	/** Key into Box's `radius` prop (and `rounded-{radius}` Tailwind utility). */
	radius: 'sm' | 'md' | 'lg'
	/** Tailwind size token for `data-slot="icon"` children. */
	icon: '4' | '5' | '6'
}

export const sun = {
	sm: { text: 'sm', space: '2', gap: '1', radius: 'sm', icon: '4' },
	md: { text: 'md', space: '3', gap: '2', radius: 'md', icon: '5' },
	lg: { text: 'lg', space: '4', gap: '3', radius: 'lg', icon: '6' },
} as const satisfies Record<Step, SunStep>
