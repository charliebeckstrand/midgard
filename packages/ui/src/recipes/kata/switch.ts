import { defineScale, type ScaleStep } from '../../core/density'
import { defineColors, defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, kasane, kokkaku, sen } from '../kiso'
import { control } from '../kiso/control'
import { dan } from '../kiso/dan'

const { cursor } = hannou
const { rounded } = kasane
const { focus } = sen
const { check } = control

const color = defineColors({
	zinc: {
		light: [
			'[--switch-bg-ring:var(--color-zinc-950)]/90 [--switch-bg:var(--color-zinc-900)]',
			'[--switch-ring:var(--color-zinc-950)]/90 [--switch-shadow:var(--color-black)]/10 [--switch:white]',
		],
		dark: [
			'dark:[--switch-bg-ring:transparent] dark:[--switch-bg:var(--color-white)]/25',
			'dark:[--switch-ring:var(--color-zinc-700)]/90',
		],
	},
	red: {
		light: [
			'[--switch-bg-ring:var(--color-red-800)]/90 [--switch-bg:var(--color-red-600)]',
			'[--switch:white] [--switch-ring:var(--color-red-800)]/90 [--switch-shadow:var(--color-red-200)]/20',
		],
		dark: 'dark:[--switch-bg-ring:transparent]',
	},
	amber: {
		light: [
			'[--switch-bg-ring:var(--color-amber-600)]/80 [--switch-bg:var(--color-amber-700)]',
			'[--switch-ring:transparent] [--switch-shadow:transparent] [--switch:var(--color-amber-100)]',
		],
		dark: 'dark:[--switch-bg-ring:transparent]',
	},
	green: {
		light: [
			'[--switch-bg-ring:var(--color-green-800)]/90 [--switch-bg:var(--color-green-600)]',
			'[--switch:white] [--switch-ring:var(--color-green-800)]/90 [--switch-shadow:var(--color-green-200)]/20',
		],
		dark: 'dark:[--switch-bg-ring:transparent]',
	},
	blue: {
		light: [
			'[--switch-bg-ring:var(--color-blue-800)]/90 [--switch-bg:var(--color-blue-600)]',
			'[--switch:white] [--switch-ring:var(--color-blue-800)]/90 [--switch-shadow:var(--color-blue-200)]/20',
		],
		dark: 'dark:[--switch-bg-ring:transparent]',
	},
})

// The ring is the only edge of an off switch, so it keeps a 3:1 contrast
// against the page in each mode (WCAG 1.4.11). A checked track replaces it.
const track = [
	...mode('bg-zinc-200', 'dark:bg-white/10'),
	'ring-1 ring-inset',
	...mode('ring-zinc-950/40', 'dark:ring-white/30'),
]

export const k = defineRecipe(
	{
		base: [
			'relative inline-flex shrink-0 items-center',
			focus.outline,
			...cursor,
			rounded.full,
			...track,
			'has-checked:bg-(--switch-bg) has-checked:ring-(--switch-bg-ring) has-checked:ring-inset',
			...mode(
				'not-has-[:disabled,:checked,[aria-readonly=true]]:hover:bg-zinc-300 not-has-[:disabled,:checked,[aria-readonly=true]]:group-has-[[data-slot=label]:hover]/field:bg-zinc-300',
				'dark:not-has-[:disabled,:checked,[aria-readonly=true]]:hover:bg-white/15 dark:not-has-[:disabled,:checked,[aria-readonly=true]]:group-has-[[data-slot=label]:hover]/field:bg-white/15',
			),
			'not-has-[:disabled,[aria-readonly=true]]:has-checked:hover:opacity-90 not-has-[:disabled,[aria-readonly=true]]:has-checked:group-has-[[data-slot=label]:hover]/field:opacity-90',
			// Validation ring overrides the resting / checked track ring when the
			// input carries a data-* severity attribute.
			...check.validation,
			'has-disabled:opacity-50',
			// The track takes the step of the nearest density scope.
			...kokkaku.switch.track,
		],
		color,
		defaults: { color: 'zinc' },
		skeleton: kokkaku.switch,
	},
	{
		input: defineRecipe({ base: check.hidden }),
		/**
		 * The thumb: the sibling that follows the native input. It moves and takes
		 * the colors of the switch when the input is checked, and it takes the step
		 * of the nearest density scope. Each class selects the thumb itself, so
		 * Chromium tests the rules only against the thumbs. At each step, the track
		 * is two thumbs and two gaps wide, so a checked thumb moves by a translate
		 * of its own width. That value does not change with the density, so a change
		 * of density starts no transition and the thumb settles with its track.
		 */
		thumb: defineRecipe({
			base: [
				'absolute inset-s-1 top-1 inline-block',
				'[:checked~&]:translate-x-full rtl:[:checked~&]:-translate-x-full',
				'bg-white ring-1 ring-zinc-950/5',
				'shadow-sm',
				rounded.full,
				'pointer-events-none',
				'motion-safe:transition-[translate] duration-200 ease-in-out',
				'[:checked~&]:bg-(--switch) [:checked~&]:shadow-(color:--switch-shadow) [:checked~&]:ring-(--switch-ring)',
				dan.size.thumb.base,
			],
		}),
	},
)

/** The size scale of {@link Switch}: the steps of its track and thumb. */
export const scale = defineScale(dan.size.row, dan.size.switch.width, dan.size.thumb.base)

/** Recipe variant props for {@link Switch}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type SwitchVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the track when the switch is on. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
	size?: ScaleStep<typeof scale>
}
