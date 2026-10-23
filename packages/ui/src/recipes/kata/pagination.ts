import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

/**
 * The page list. Below the `sm` width of the pagination container, the list
 * goes compact: it keeps the current page and the two items on each side of it,
 * and hides the other items. Below the `2xs` width, it keeps only the
 * current page. Previous and Next stay in the row at each width.
 */
const list = {
	base: [
		flex.row,
		'list-none',
		dan.gap.scale.xs,
		'm-0 p-0',
		'@max-sm/pagination:[&>li:not(:has([aria-current=page]),:has(+li_[aria-current=page]),:has(+li+li_[aria-current=page]),:has([aria-current=page])+li,:has([aria-current=page])+li+li)]:hidden',
		'@max-2xs/pagination:[&>li:not(:has([aria-current=page]))]:hidden',
	],
}

const button = {
	base: [
		// `z-1` lifts the button above its sibling active indicator.
		'relative z-1',
		flex.inline,
		'justify-center',
		'min-w-9',
		'p-2',
		size.sm,
		weight.medium,
		rounded.lg,
		focus.ring,
		...cursor,
	],
	current: {
		true: [...text.default],
		false: [...text.muted, ...fg.hover],
	},
}

const gap = {
	base: [flex.inline, 'justify-center', 'min-w-9', size.sm, ...text.muted, 'select-none'],
}

export const k = defineKata(
	{
		// The gap also caps the hit areas of Previous and Next (`TouchTarget`). A
		// narrow grid hides the page list, and the two buttons then sit side by side.
		//
		// The root is the size container of the compact page list. A size container
		// takes no width from its content, so the root fills the inline axis. In a
		// flex row, the consumer gives it a width, for example `flex-1`.
		base: [
			'@container/pagination',
			'w-full',
			flex.row,
			'list-none',
			dan.gap.scale.xs,
			dan.gap.touch.x.xs,
		],
		slots: {
			list,
			/** Positioning wrapper around each page button; hosts the active indicator. */
			page: {
				base: 'group relative inline-flex',
				slots: {
					button,
				},
			},
			gap,
		},
		defaults: { current: false },
	},
	{ skeleton: kokkaku.pagination },
)

/** Recipe variant props for the {@link PaginationPage} button: its styling axes (`current`), for consumers composing custom slots. */
export type PageButtonVariants = {
	/** Marks the button as the current page. @defaultValue false */
	current?: VariantProps<typeof k>['current']
}
