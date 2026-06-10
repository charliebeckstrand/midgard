/**
 * Sun (寸): size step keys.
 *
 * The named density steps shared by interactive components (`sm` / `md` /
 * `lg`). `steps` is the list, `Step` the prop type. `sun` is the per-step
 * data table: text/radius/icon tokens for components that need to read a
 * specific axis at a given step. Spacing axes (padding, gap) live on `ma`
 * and are composed inline at the kata layer.
 *
 * Layer: kiso · Concern: size
 */

export const steps = ['sm', 'md', 'lg'] as const

export type Step = (typeof steps)[number]

type SunStep = {
	/** Key into `ji`; bundles font-size + line-height. */
	text: 'sm' | 'md' | 'lg'
	/** Key into Box's `radius` prop (and `rounded-{radius}` Tailwind utility). */
	radius: 'sm' | 'md' | 'lg'
	/** Tailwind size token for `data-slot="icon"` children. */
	icon: '4' | '5' | '6'
}

export const sun = {
	sm: { text: 'sm', radius: 'sm', icon: '4' },
	md: { text: 'md', radius: 'md', icon: '5' },
	lg: { text: 'lg', radius: 'lg', icon: '6' },
} as const satisfies Record<Step, SunStep>
