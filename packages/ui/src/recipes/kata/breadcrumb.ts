import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'

const { fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

// The trail wraps, so a long one stays inside a narrow screen (WCAG 1.4.10).
const list = defineRecipe({
	base: [flex.row, 'flex-wrap', 'gap-2', 'break-words', size.md],
})

const item = defineRecipe({
	base: [flex.inline, 'gap-2'],
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
	base: [...text.muted, '[&>svg]:size-3.5'],
})

export const k = {
	list,
	item,
	link,
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
