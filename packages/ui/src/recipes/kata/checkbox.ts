import { defineScale, type ScaleStep } from '../../core/density'
import { defineColors, defineKata, type VariantProps } from '../../core/recipe'
import { dan, kokkaku } from '../kiso'
import { check } from '../kumi/check'

const { checkbox } = kokkaku

export const k = defineKata(
	{
		extends: check,
		slots: {
			base: {
				base: [
					'[--check-border:transparent]',
					// One selector list holds the checked and the indeterminate state. The
					// indeterminate arm reads `data-indeterminate`, not `:indeterminate`.
					// Only a client effect sets the DOM property, so the server HTML has only
					// the attribute.
					'has-[:checked,[data-indeterminate]]:bg-(--check-bg) has-[:checked,[data-indeterminate]]:border-(--check-border)',
					'not-has-disabled:has-[:checked,[data-indeterminate]]:hover:opacity-90',
					// The box takes the step of the nearest density scope.
					checkbox.box,
					dan.radius.check,
				],
				color: defineColors({
					zinc: '[--check-mark:var(--color-white)] [--check-bg:var(--color-zinc-600)] [--check-border:var(--color-zinc-700)]/90',
				}),
			},
			/**
			 * The check mark: the sibling that follows the native input. It shows when
			 * the input is checked or carries `data-indeterminate`, and it takes the
			 * step of the nearest density scope. Each class selects the mark itself,
			 * so Chromium tests the rules only against the marks.
			 */
			mark: {
				base: [
					'pointer-events-none absolute stroke-(--check-mark) opacity-0',
					'[:is(:checked,[data-indeterminate])~&]:opacity-100',
					dan.size.check.mark,
				],
			},
		},
	},
	{ skeleton: checkbox },
)

/** The size scale of {@link Checkbox}: the steps of its box, radius, and mark. */
export const scale = defineScale(dan.size.check.box, dan.radius.check, dan.size.check.mark)

/** Recipe variant props for {@link Checkbox}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type CheckboxVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the box when it is checked. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
	size?: ScaleStep<typeof scale>
}
