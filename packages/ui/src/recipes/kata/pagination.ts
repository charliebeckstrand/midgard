import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor, fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

/**
 * The page list. Below the `sm` width of the pagination container, the list
 * goes compact: it keeps the current page and hides the other pages and the
 * gaps, so Previous and Next stay in the row.
 */
const list = defineRecipe({
	base: [
		flex.row,
		'list-none',
		dan.gap.scale.xs,
		'm-0 p-0',
		'@max-sm/pagination:[&>li:not(:has([aria-current=page]))]:hidden',
	],
})

const button = defineRecipe({
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
	defaults: { current: false },
})

const gap = defineRecipe({
	base: [flex.inline, 'justify-center', 'min-w-9', size.sm, ...text.muted, 'select-none'],
})

export const k = defineRecipe(
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
			...dan.gap.touch.x.xs,
		],
		skeleton: kokkaku.pagination,
	},
	{
		list,
		page: {
			/** Positioning wrapper around each page button; hosts the active indicator. */
			base: 'group relative inline-flex',
			button,
		},
		gap,
	},
)

/** Recipe variant props for the {@link PaginationPage} button — its styling axes (`current`), for consumers composing custom slots. */
export type PageButtonVariants = Omit<VariantProps<typeof button>, 'current'> & {
	/** Whether the button is the current page. @defaultValue false */
	current?: VariantProps<typeof button>['current']
}
