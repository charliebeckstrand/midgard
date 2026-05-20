/**
 * Sun (寸) — size step keys.
 *
 * The named density steps shared by interactive components (`sm` / `md` /
 * `lg`). `steps` is the list, `Step` the prop type. `sun` is the per-step
 * data table — text/space/gap/radius/icon tokens for components that need to
 * read a specific axis at a given step.
 *
 * Layer: kiso · Concern: size
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
