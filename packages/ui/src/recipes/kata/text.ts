/**
 * Text kata: recipe-shaped surface for `<Text>` with two independent color
 * axes plus a type scale. `tone` pulls the semantic `iro.text` tokens
 * (default / primary / success / warning / error / muted) and is the
 * meaning-bearing axis. It is an emphasis ladder, not the feedback set
 * `severity` names on Alert and the Control cascade. `color` names a hue in
 * place of a purpose, and takes the `onSurface` shade of that hue from the iro
 * ramp, as `tone` does. A consumer sets one or the other — tone for emphasis,
 * color for a hue.
 *
 * `size` is a density step from `xs` to `xl` (`text-xs` to `text-xl`). The
 * component writes it as a density scope, and `sized` gives the text the step
 * of that scope. Without `size`, Text takes the size of its parent text, which
 * follows the density of its scope. `xs` is for a subordinate line set under a
 * `sm` one, such as the trailing readout of a legend entry under its label.
 */
import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, kokkaku } from '../kiso'
import { dan } from '../kiso/dan'

const { palette, text } = iro

const { text: hue } = palette.bare

export const k = defineRecipe(
	{
		tone: {
			default: [...text.default],
			primary: [...text.primary],
			success: [...text.success],
			warning: [...text.warning],
			error: [...text.error],
			muted: [...text.muted],
		},
		color: {
			current: mode('text-current', 'dark:text-current'),
			zinc: [...hue.zinc],
			red: [...hue.red],
			amber: [...hue.amber],
			green: [...hue.green],
			blue: [...hue.blue],
		},
		defaults: { tone: 'default' },
		// One line: the `md` line, or the line of the explicit `size`.
		skeleton: { base: kokkaku.text.line, density: true as const },
	},
	{
		/** The text ramp of a Text with a `size`. */
		sized: dan.text.chip,
	},
)

/** The size scale of {@link Text}: the steps of its text. */
export const scale = defineScale(dan.text.chip)

/** Recipe variant props for {@link Text}: the `tone` and `color` axes of its kata, and the `size` step that the component writes as a density scope. */
export type TextVariants = Omit<VariantProps<typeof k>, 'tone' | 'color'> & {
	/** The emphasis of the text, which sets a semantic text color. @defaultValue 'default' */
	tone?: VariantProps<typeof k>['tone']
	/**
	 * A hue for the text, at the shade that clears text AA on the page surface.
	 * Set it in place of `tone` for a hue that names no purpose.
	 * @defaultValue No color: the `tone` sets the text color.
	 */
	color?: VariantProps<typeof k>['color']
	/**
	 * The density step. Omit it to take the size of the parent. A step makes the
	 * text a density scope, so its children take the step too.
	 */
	size?: ScaleStep<typeof scale>
}
