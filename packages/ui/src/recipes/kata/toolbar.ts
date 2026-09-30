/**
 * Toolbar kata: object-literal surface for `<Toolbar>` and its button groups.
 * The `root` sub-recipe axes on `orientation` and `variant` (plain / outline /
 * solid); the `group` sub-recipe axes on `orientation` to cluster related
 * controls.
 */
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { kasane, narabi, omote, sen } from '../kiso'

const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border } = sen

/**
 * The toolbar. Its gap also caps the hit areas of its buttons (`TouchTarget`),
 * so two adjacent buttons split the gap and do not overlap. A horizontal
 * toolbar wraps, so it caps both axes.
 */
const root = defineRecipe({
	base: flex.row,
	orientation: {
		horizontal: [
			'flex-row flex-wrap gap-1',
			'[--touch-target-gap-x:--spacing(1)] [--touch-target-gap-y:--spacing(1)]',
		],
		vertical: 'flex-col w-fit gap-1 [--touch-target-gap-y:--spacing(1)]',
	},
	variant: {
		plain: '',
		outline: [...border.default, rounded.lg, 'p-1'],
		solid: [...bg.tint, 'border border-transparent', rounded.lg, 'p-1'],
	},
	defaults: { orientation: 'horizontal', variant: 'plain' },
})

/** A group of the toolbar. Its gap caps the hit areas of its buttons, as in `root`. */
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
	root,
	group,
} as const

/** Recipe variant props for {@link Toolbar} — the styling axes its kata exposes (`orientation`, `variant`), for consumers composing custom slots. */
export type ToolbarVariants = VariantProps<typeof root>
/** Recipe variant props for a {@link Toolbar} group — its styling axes (`orientation`), for consumers composing custom slots. */
export type ToolbarGroupVariants = VariantProps<typeof group>
