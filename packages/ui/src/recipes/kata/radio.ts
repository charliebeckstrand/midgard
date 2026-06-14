import { defineColors, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { kasane, kokkaku } from '../kiso'
import { control } from '../kiso/control'

const { rounded } = kasane
const { radio } = kokkaku

const color = defineColors({
	zinc: {
		light:
			'[--check-bg:var(--color-zinc-900)] [--check-border:var(--color-zinc-950)]/90 [--check-mark:var(--color-white)]',
		dark: 'dark:[--check-bg:var(--color-zinc-600)] dark:[--check-border:var(--color-zinc-700)]/90',
	},
	...control.check.color,
})

export const k = bridge.check(
	control,
	{
		base: [
			'has-checked:*:data-[slot=radio-indicator]:opacity-100',
			rounded.full,
			'[--check-border:transparent]',
			'has-checked:bg-(--check-bg) has-checked:border-(--check-border)',
			'not-has-[:disabled]:has-checked:hover:opacity-90',
		],
		color,
		size: {
			sm: 'size-4',
			md: 'size-4.5',
			lg: 'size-5',
		},
		skeleton: radio,
	},
	{
		/** Indicator dot size class per radio size step. Read by the component. */
		indicatorSize: {
			sm: 'size-1',
			md: 'size-1.5',
			lg: 'size-2',
		} as const,
	},
)

/** Recipe variant props for {@link Radio} — the styling axes its kata exposes (`color`, `size`), for consumers composing custom slots. */
export type RadioVariants = VariantProps<typeof k>
