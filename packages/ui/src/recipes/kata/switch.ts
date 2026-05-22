import { defineColors, defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { control } from '../genkei/control'
import { hannou, iro, kokkaku, narabi, sen } from '../kiso'

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

const track = ['bg-zinc-200', 'dark:bg-white/10', ...sen.ringInset]

const field = defineRecipe({
	base: [...narabi.toggle, '*:data-[slot=control]:row-span-2 *:data-[slot=control]:mt-0'],
	size: {
		sm: 'grid-cols-[2rem_1fr]',
		md: 'grid-cols-[2.5rem_1fr]',
		lg: 'grid-cols-[3rem_1fr]',
	},
	defaults: { size: 'md' },
})

export const k = defineRecipe(
	{
		base: [
			'relative inline-flex shrink-0 items-center',
			sen.focus.outline,
			...hannou.cursor,
			'has-checked:*:data-[slot=switch-thumb]:bg-(--switch)',
			'has-checked:*:data-[slot=switch-thumb]:shadow-(--switch-shadow)',
			'has-checked:*:data-[slot=switch-thumb]:ring-(--switch-ring)',
			'rounded-full',
			...track,
			'has-checked:bg-(--switch-bg) has-checked:ring-(--switch-bg-ring) has-checked:ring-inset',
			'not-has-[:disabled]:not-has-[:checked]:hover:bg-zinc-300',
			'dark:not-has-[:disabled]:not-has-[:checked]:hover:bg-white/15',
			'not-has-[:disabled]:has-checked:hover:opacity-90',
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
	},
	{
		input: defineRecipe({ base: check.hidden }),
		thumb: defineRecipe({
			base: [
				'absolute top-1 left-1 inline-block',
				'bg-white ring-1 ring-zinc-950/5',
				'shadow-sm',
				'rounded-full',
				'pointer-events-none',
				'transition-[left] duration-200 ease-in-out',
			],
		}),
		field,
		/** Disabled-state text class shared by the switch field wrapper. */
		disabled: iro.text.disabled,
		skeleton: kokkaku.switch,
	},
)

export type SwitchVariants = VariantPropsOf<typeof k>
export type SwitchFieldVariants = VariantPropsOf<typeof field>
