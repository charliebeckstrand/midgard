import { defineScale, type ScaleStep } from '../../core/density'
import { defineColors, defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { kokkaku } from '../kiso'
import { control } from '../kiso/control'
import { dan } from '../kiso/dan'

const { checkbox } = kokkaku

const color = defineColors({
	zinc: '[--check-mark:var(--color-white)] [--check-bg:var(--color-zinc-600)] [--check-border:var(--color-zinc-700)]/90',
	...control.check.color,
})

export const k = bridge.check(
	control,
	{
		base: [
			'[--check-border:transparent]',
			'has-checked:bg-(--check-bg) has-checked:border-(--check-border)',
			// The indeterminate rules read `data-indeterminate`, not `:indeterminate`.
			// Only a client effect sets the DOM property, so the server HTML has only
			// the attribute.
			'has-[[data-indeterminate]]:bg-(--check-bg) has-[[data-indeterminate]]:border-(--check-border)',
			'not-has-[:disabled]:has-checked:hover:opacity-90',
			'not-has-[:disabled]:has-[[data-indeterminate]]:hover:opacity-90',
			// The box takes the step of the nearest density scope.
			checkbox.box,
			dan.radius.check,
		],
		color,
		skeleton: checkbox,
	},
	{
		/**
		 * The check mark: the sibling that follows the native input. It shows when
		 * the input is checked or carries `data-indeterminate`, and it takes the
		 * step of the nearest density scope. Each class selects the mark itself,
		 * so Chromium tests the rules only against the marks.
		 */
		mark: defineRecipe({
			base: [
				'pointer-events-none absolute stroke-(--check-mark) opacity-0',
				'[:checked~&]:opacity-100 [[data-indeterminate]~&]:opacity-100',
				dan.size.check.mark,
			],
		}),
	},
)

/** The size scale of {@link Checkbox}: the steps of its box, radius, and mark. */
export const scale = defineScale(dan.size.check.box, dan.radius.check, dan.size.check.mark)

/** Recipe variant props for {@link Checkbox}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type CheckboxVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the box when it is checked. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
	size?: ScaleStep<typeof scale>
}
