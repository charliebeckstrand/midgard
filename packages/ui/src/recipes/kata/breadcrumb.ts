import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { fg } = hannou
const { text } = iro
const { weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

// The trail wraps, so a long one stays inside a narrow screen (WCAG 1.4.10).
// A collapsing trail (`data-collapse` on the `<nav>`) stays on one line
// instead, and only the current page can be narrower than its text.
const list = defineRecipe({
	base: [
		flex.row,
		'flex-wrap',
		dan.gap.scale.sm,
		'wrap-break-word',
		ji.ramp,
		'in-data-collapse:min-w-0 in-data-collapse:flex-nowrap',
	],
})

const item = defineRecipe({
	base: [
		flex.inline,
		dan.gap.scale.sm,
		'in-data-collapse:shrink-0 in-data-collapse:last:min-w-0 in-data-collapse:last:shrink',
	],
})

// In a collapsing trail, the crumb is a row of its label and its `…` mark, and
// one of the two is closed to nothing. Both stay laid out, so the fit reads a
// closed label's full width. The mark is closed until the fit's rule opens it.
const crumb = defineRecipe({
	base: 'in-data-collapse:flex in-data-collapse:min-w-0 in-data-collapse:max-w-full',
})

const label = defineRecipe({
	base: 'in-data-collapse:block in-data-collapse:min-w-0 in-data-collapse:truncate',
})

const mark = defineRecipe({
	base: "hidden after:content-['…'] in-data-collapse:block in-data-collapse:min-w-0 in-data-collapse:max-w-0 in-data-collapse:truncate",
})

const link = defineRecipe({
	base: [rounded.sm, focus.ring],
	current: {
		true: [text.default, weight.normal],
		false: text.muted,
	},
	// A crumb with an `href` is a link, and it darkens on hover. A crumb with no
	// `href` is text, so the pointer gets no response from it.
	interactive: {
		true: fg.hover,
		false: '',
	},
	defaults: { current: false, interactive: false },
})

const separator = defineRecipe({
	base: [...text.muted, dan.size.separator.svg, 'in-data-collapse:shrink-0'],
})

export const k = {
	list,
	item,
	link,
	crumb,
	label,
	mark,
	separator,
	skeleton: kokkaku.breadcrumb,
} as const

/** Recipe variant props for a {@link Breadcrumb} link — its styling axes (`current`, `interactive`), for consumers composing custom slots. */
export type BreadcrumbLinkVariants = Omit<VariantProps<typeof link>, 'current' | 'interactive'> & {
	/** Whether the link goes to the current page. @defaultValue false */
	current?: VariantProps<typeof link>['current']
	/** Whether the crumb is a link, which darkens on hover. @defaultValue false */
	interactive?: VariantProps<typeof link>['interactive']
}
