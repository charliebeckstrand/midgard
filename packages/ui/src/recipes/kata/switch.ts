import type { DensityStep } from '../../core/density'
import { defineColors, defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, kasane, kokkaku, narabi, sen } from '../kiso'
import { control } from '../kiso/control'

const { cursor, fg } = hannou
const { rounded } = kasane
const { toggle } = narabi
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

// The control column sizes to the switch itself so the toggle grid's gap
// stays uniform across switch sizes without a matching field-level prop. The
// switch stays in the label row, as the Checkbox and the Radio do, so it
// centers on the label and not on the label and the description. A large switch
// is taller than the label line, so the label also centers in its row.
const field = defineRecipe({
	base: [...toggle, 'grid-cols-[auto_1fr]', '*:data-[slot=label]:self-center'],
})

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
				'not-has-[:disabled]:not-has-[:checked]:hover:bg-zinc-300 not-has-[:disabled]:not-has-[:checked]:group-has-[[data-slot=label]:hover]/field:bg-zinc-300',
				'dark:not-has-[:disabled]:not-has-[:checked]:hover:bg-white/15 dark:not-has-[:disabled]:not-has-[:checked]:group-has-[[data-slot=label]:hover]/field:bg-white/15',
			),
			'not-has-[:disabled]:has-checked:hover:opacity-90 not-has-[:disabled]:has-checked:group-has-[[data-slot=label]:hover]/field:opacity-90',
			// Validation ring overrides the resting / checked track ring when the
			// input carries a data-* severity attribute.
			...check.validation,
			'has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed',
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
		 * Chromium tests the rules only against the thumbs. The resting offset
		 * applies only to an unchecked input: a plain `left` is not in a density
		 * sublayer, so it wins over the stepped offset of the checked thumb.
		 */
		thumb: defineRecipe({
			base: [
				'absolute top-1 inline-block',
				'[:not(:checked)~&]:left-1',
				'bg-white ring-1 ring-zinc-950/5',
				'shadow-sm',
				rounded.full,
				'pointer-events-none',
				'transition-[left] duration-200 ease-in-out',
				'[:checked~&]:bg-(--switch) [:checked~&]:shadow-(--switch-shadow) [:checked~&]:ring-(--switch-ring)',
				'density-size-[3,4,5]',
				'[:checked~&]:density-left-[4,5,6]',
			],
		}),
		field,
		/** Disabled-state text class shared by the switch field wrapper. */
		disabled: fg.disabled,
	},
)

/** Recipe variant props for {@link Switch}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type SwitchVariants = VariantProps<typeof k> & { size?: DensityStep }
