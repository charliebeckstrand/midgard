/**
 * Toolbar kata: the unit of `<Toolbar>` and its button groups. The root slot
 * has the `orientation`, `variant` (plain / outline / solid), and `overflow`
 * (wrap / more) axes. The `group` slot clusters related controls, and the
 * `separator` slot spaces a rule between two groups. Both have an
 * `orientation` axis. The `more` slot anchors the More button of a toolbar
 * that fits its row with More.
 */
import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, kasane, narabi, omote, sen } from '../kiso'

const { rounded } = kasane
const { flex, touch } = narabi
const { bg } = omote
const { border } = sen

export const k = defineKata({
	/**
	 * The toolbar. Its gap also caps the hit areas of its buttons (`TouchTarget`),
	 * so two adjacent buttons split the gap and do not overlap. A horizontal
	 * toolbar wraps, so it caps both axes.
	 *
	 * Along its axis, the hit areas tile: each one fills half of the gap on each
	 * side, so the pointer meets no dead space between two buttons, as between
	 * two tabs. The buttons keep their space. The cross axis keeps the floor, so
	 * a hit area does not go into the field or the content next to the toolbar.
	 *
	 * In a horizontal toolbar, the item after a separator that starts a wrapped
	 * row moves back over the box of the separator and the gap.
	 */
	base: flex.row,
	orientation: {
		horizontal: [
			'flex-row flex-wrap',
			dan.gap.x.xs,
			dan.gap.touch.x.xs,
			dan.gap.touch.y.xs,
			touch.tile.x,
			dan.space.toolbar.rowStart,
		],
		vertical: ['flex-col w-fit', dan.gap.scale.xs, dan.gap.touch.y.xs, touch.tile.y],
	},
	variant: {
		plain: '',
		outline: [...border.default, rounded.lg, 'p-1'],
		solid: [...bg.tint, 'border border-transparent', rounded.lg, 'p-1'],
	},
	/**
	 * What a horizontal toolbar does with the items that its row cannot hold:
	 * they wrap onto more rows, or they wait behind More.
	 */
	overflow: { wrap: '', more: '' },
	compound: [
		{ orientation: 'horizontal', overflow: 'wrap', class: dan.gap.y.xs },
		/**
		 * A toolbar that fits its row with More is one row, and CSS fits it with no
		 * measure, so the server paints the fit, as in a collapsing `Breadcrumb`.
		 * The items wrap as usual, but the toolbar shows only its first row. Each
		 * item after the first has a negative bottom margin that is more than its
		 * height, so a wrapped row takes no height, and each wrapped item sits at
		 * the same place below the clip. The first item gives the row its height,
		 * so the items of the row have one height, as icon buttons do. A
		 * separator has no height of its own and stretches to its row, so it needs
		 * no margin. `h-fit` keeps the height of the first row in a grid or a flex
		 * parent that would stretch the toolbar.
		 *
		 * The end of the row keeps room for the More button. The last item takes
		 * the room back while it is on the row, so a toolbar that fits paints as
		 * it would without the room. An item that a script pages out (`data-paged`)
		 * has no box.
		 */
		{
			orientation: 'horizontal',
			overflow: 'more',
			class: [
				'relative h-fit items-start overflow-y-clip',
				dan.space.toolbar.more,
				'pe-(--ui-toolbar-more) [&>:nth-last-child(2)]:-me-(--ui-toolbar-more)',
				'[&>:not(:first-child):not([data-slot=toolbar-separator])]:-mb-[100vh]',
				'[&>[data-paged]]:hidden',
			],
		},
	],
	slots: {
		/**
		 * A group of the toolbar. Its gap is below the toolbar gap at each density
		 * step, and it caps the hit areas of its buttons, as in `base`. The tile of
		 * the toolbar inherits, so the hit areas also fill the gap in the group.
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
		/**
		 * The anchor of the More button: the last item of a toolbar that fits its
		 * row with More. It has no width, and it gives back the gap before it, so
		 * it is on the row while the last item is. Its button is out of the flow,
		 * at the end of the toolbar and one row above the anchor. While the last
		 * item is on the row, the button is thus above the clip. While the last
		 * item has wrapped, the anchor is on a wrapped row, and the button is at
		 * the end of the first row, in the room that the toolbar keeps for it.
		 */
		more: {
			base: ['flex w-0 -ms-(--ui-toolbar-gap)', '*:absolute *:end-0 *:-translate-y-full'],
		},
	},
	defaults: { orientation: 'horizontal', variant: 'plain', overflow: 'wrap' },
})

/** Recipe variant props for {@link Toolbar}: the styling axes its kata exposes (`orientation`, `variant`), for consumers composing custom slots. */
export type ToolbarVariants = Omit<
	VariantProps<typeof k>,
	'orientation' | 'variant' | 'overflow'
> & {
	/** The layout axis of the toolbar, and the axis of its arrow-key navigation. @defaultValue 'horizontal' */
	orientation?: VariantProps<typeof k>['orientation']
	/** The frame of the toolbar: no frame, a border, or a tinted fill. @defaultValue 'plain' */
	variant?: VariantProps<typeof k>['variant']
}
/** Recipe variant props for a {@link Toolbar} group: its styling axes (`orientation`), for consumers composing custom slots. */
export type ToolbarGroupVariants = {
	/** The axis of the group. @defaultValue 'horizontal' */
	orientation?: VariantProps<typeof k>['orientation']
}
