import { defineColors, defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, kasane, kokkaku, narabi, sen } from '../kiso'
import { control } from '../kiso/control'

const { cursor, fg } = hannou
const { rounded } = kasane
const { toggle } = narabi
const { focus, ring } = sen
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

const track = [...mode('bg-zinc-200', 'dark:bg-white/10'), ...ring.inset]

// The control column sizes to the switch itself so the toggle grid's gap
// stays uniform across switch sizes without a matching field-level prop.
const field = defineRecipe({
	base: [
		...toggle,
		'grid-cols-[auto_1fr]',
		'*:data-[slot=control]:row-span-2 *:data-[slot=control]:mt-0',
	],
})

export const k = defineRecipe(
	{
		base: [
			'relative inline-flex shrink-0 items-center',
			focus.outline,
			...cursor,
			'has-checked:*:data-[slot=switch-thumb]:bg-(--switch)',
			'has-checked:*:data-[slot=switch-thumb]:shadow-(--switch-shadow)',
			'has-checked:*:data-[slot=switch-thumb]:ring-(--switch-ring)',
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
		],
		color,
		size: {
			sm: [
				'h-5 w-8',
				'*:data-[slot=switch-thumb]:size-3',
				'has-checked:*:data-[slot=switch-thumb]:left-4',
			],
			md: [
				'h-6 w-10',
				'*:data-[slot=switch-thumb]:size-4',
				'has-checked:*:data-[slot=switch-thumb]:left-5',
			],
			lg: [
				'h-7 w-12',
				'*:data-[slot=switch-thumb]:size-5',
				'has-checked:*:data-[slot=switch-thumb]:left-6',
			],
		},
		defaults: { color: 'zinc', size: 'md' },
		skeleton: kokkaku.switch,
	},
	{
		input: defineRecipe({ base: check.hidden }),
		thumb: defineRecipe({
			base: [
				'absolute top-1 left-1 inline-block',
				'bg-white ring-1 ring-zinc-950/5',
				'shadow-sm',
				rounded.full,
				'pointer-events-none',
				'transition-[left] duration-200 ease-in-out',
			],
		}),
		field,
		/** Disabled-state text class shared by the switch field wrapper. */
		disabled: fg.disabled,
	},
)

/** Recipe variant props for {@link Switch} — the styling axes its kata exposes (`color`, `size`), for consumers composing custom slots. */
export type SwitchVariants = VariantProps<typeof k>
