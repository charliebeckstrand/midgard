import type { ControlStep } from '../../core/density'
import { defineColors, defineRecipe, type VariantProps } from '../../core/recipe'
import { bridge } from '../katakana'
import { kokkaku } from '../kiso'
import { control } from '../kiso/control'

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
			'has-[disabled]:cursor-not-allowed has-[disabled]:opacity-50',
			'has-[:indeterminate]:bg-(--check-bg) has-[:indeterminate]:border-(--check-border)',
			'not-has-[:disabled]:has-checked:hover:opacity-90',
			'not-has-[:disabled]:has-[:indeterminate]:hover:opacity-90',
			// The box takes the step of the nearest density scope.
			kokkaku.checkbox.box,
			'density-rounded-[0.75,1,1.25]',
		],
		color,
		skeleton: checkbox,
	},
	{
		/**
		 * The check mark: the sibling that follows the native input. It shows when
		 * the input is checked or indeterminate, and it takes the step of the
		 * nearest density scope. Each class selects the mark itself, so Chromium
		 * tests the rules only against the marks.
		 */
		mark: defineRecipe({
			base: [
				'pointer-events-none absolute stroke-(--check-mark) opacity-0',
				'[:checked~&]:opacity-100 [:indeterminate~&]:opacity-100',
				'density-size-[3,3.5,4]',
			],
		}),
	},
)

/** Recipe variant props for {@link Checkbox}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type CheckboxVariants = VariantProps<typeof k> & { size?: ControlStep }
