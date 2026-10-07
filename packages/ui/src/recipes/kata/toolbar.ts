/**
 * Toolbar kata: object-literal surface for `<Toolbar>` and its button groups.
 * The `base` sub-recipe axes on `orientation` and `variant` (plain / outline /
 * solid); the `group` sub-recipe axes on `orientation` to cluster related
 * controls.
 */
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { kasane, narabi, omote, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border } = sen

/**
 * The toolbar. Its gap also caps the hit areas of its buttons (`TouchTarget`),
 * so two adjacent buttons split the gap and do not overlap. A horizontal
 * toolbar wraps, so it caps both axes.
 */
const toolbar = defineRecipe({
	base: flex.row,
	orientation: {
		horizontal: [
			'flex-row flex-wrap',
			dan.gap.scale.xs,
			...dan.gap.touch.x.xs,
			...dan.gap.touch.y.xs,
		],
		vertical: ['flex-col w-fit', dan.gap.scale.xs, ...dan.gap.touch.y.xs],
	},
	variant: {
		plain: '',
		outline: [...border.default, rounded.lg, 'p-1'],
		solid: [...bg.tint, 'border border-transparent', rounded.lg, 'p-1'],
	},
	defaults: { orientation: 'horizontal', variant: 'plain' },
})

/** A group of the toolbar. Its gap caps the hit areas of its buttons, as in `base`. */
const group = defineRecipe({
	// The group is a `<fieldset>`. `min-w-auto` replaces its min-content floor,
	// so it sizes as a `<div>` does.
	base: [flex.row, 'min-w-auto'],
	orientation: {
		horizontal: 'flex-row gap-0.5 [--touch-target-gap-x:--spacing(0.5)]',
		vertical: 'flex-col gap-0.5 [--touch-target-gap-y:--spacing(0.5)]',
	},
	defaults: { orientation: 'horizontal' },
})

export const k = {
	base: toolbar,
	group,
} as const

/** Recipe variant props for {@link Toolbar} — the styling axes its kata exposes (`orientation`, `variant`), for consumers composing custom slots. */
export type ToolbarVariants = Omit<VariantProps<typeof k.base>, 'orientation' | 'variant'> & {
	/** The axis of the toolbar. @defaultValue 'horizontal' */
	orientation?: VariantProps<typeof k.base>['orientation']
	/** The frame of the toolbar: no frame, a border, or a tinted fill. @defaultValue 'plain' */
	variant?: VariantProps<typeof k.base>['variant']
}
/** Recipe variant props for a {@link Toolbar} group — its styling axes (`orientation`), for consumers composing custom slots. */
export type ToolbarGroupVariants = Omit<VariantProps<typeof group>, 'orientation'> & {
	/** The axis of the group. @defaultValue 'horizontal' */
	orientation?: VariantProps<typeof group>['orientation']
}
