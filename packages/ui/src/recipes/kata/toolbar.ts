/**
 * Toolbar kata: the unit of `<Toolbar>` and its button groups. The root slot
 * has the `orientation` and `variant` (plain / outline / solid) axes. The
 * `group` slot clusters related controls, and the `separator` slot spaces a
 * rule between two groups. Both have an `orientation` axis.
 */
import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, kasane, narabi, omote, sen } from '../kiso'

const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border } = sen

export const k = defineKata({
	/**
	 * The toolbar. Its gap also caps the hit areas of its buttons (`TouchTarget`),
	 * so two adjacent buttons split the gap and do not overlap. A horizontal
	 * toolbar wraps, so it caps both axes.
	 */
	base: flex.row,
	orientation: {
		horizontal: ['flex-row flex-wrap', dan.gap.scale.xs, dan.gap.touch.x.xs, dan.gap.touch.y.xs],
		vertical: ['flex-col w-fit', dan.gap.scale.xs, dan.gap.touch.y.xs],
	},
	variant: {
		plain: '',
		outline: [...border.default, rounded.lg, 'p-1'],
		solid: [...bg.tint, 'border border-transparent', rounded.lg, 'p-1'],
	},
	slots: {
		/**
		 * A group of the toolbar. Its gap is below the toolbar gap at each density
		 * step, and it caps the hit areas of its buttons, as in `base`.
		 */
		group: {
			// The group is a `<fieldset>`. `min-w-auto` replaces its min-content floor,
			// so it sizes as a `<div>` does.
			base: [flex.row, 'min-w-auto'],
			orientation: {
				horizontal: ['flex-row', dan.gap.toolbar.group, dan.gap.touch.toolbar.group.x],
				vertical: ['flex-col', dan.gap.toolbar.group, dan.gap.touch.toolbar.group.y],
			},
		},
		/**
		 * A separator of the toolbar. Its margin is the toolbar gap at each density
		 * step, so the space on each side of the rule is the space between two groups.
		 */
		separator: {
			orientation: {
				horizontal: dan.space.toolbar.separator.x,
				vertical: dan.space.toolbar.separator.y,
			},
		},
	},
	defaults: { orientation: 'horizontal', variant: 'plain' },
})

/** Recipe variant props for {@link Toolbar}: the styling axes its kata exposes (`orientation`, `variant`), for consumers composing custom slots. */
export type ToolbarVariants = Omit<VariantProps<typeof k>, 'orientation' | 'variant'> & {
	/** The axis of the toolbar. @defaultValue 'horizontal' */
	orientation?: VariantProps<typeof k>['orientation']
	/** The frame of the toolbar: no frame, a border, or a tinted fill. @defaultValue 'plain' */
	variant?: VariantProps<typeof k>['variant']
}
/** Recipe variant props for a {@link Toolbar} group: its styling axes (`orientation`), for consumers composing custom slots. */
export type ToolbarGroupVariants = {
	/** The axis of the group. @defaultValue 'horizontal' */
	orientation?: VariantProps<typeof k>['orientation']
}
