import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, hannou, iro, ji, kasane, kokkaku, narabi, sen } from '../kiso'

const { fg } = hannou
const { text } = iro
const { weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { focus } = sen

export const k = defineKata(
	{
		slots: {
			// The trail wraps, so a long one stays inside a narrow screen (WCAG 1.4.10).
			//
			// A collapsing trail (`data-collapse` on the `<nav>`) is one line that CSS fits
			// with no measure, so the server paints the fit. The list lays out its items
			// from the current page back to the first crumb (`order`, from the rule of
			// `Breadcrumb`). A crumb that the line cannot hold whole wraps, and each crumb
			// before it wraps too. The list shows only its first line, and a wrapped line
			// takes no height, so each wrapped crumb sits at the same place below the clip.
			// The start of the line keeps room for one `…` mark. The first crumb takes the
			// room back while it is on the line, so a trail that fits paints as it would
			// without the room. The clip keeps space for the focus ring above and below
			// the line, and the list keeps the height of one line in the row.
			list: [
				flex.row,
				'flex-wrap',
				dan.gap.scale.sm,
				'wrap-break-word',
				dan.text.body,
				'in-data-collapse:relative',
				'in-data-collapse:min-w-0 in-data-collapse:flex-row-reverse in-data-collapse:content-start in-data-collapse:items-start in-data-collapse:justify-end',
				'in-data-collapse:h-[calc(1lh+2*var(--ui-breadcrumb-ring))]',
				'in-data-collapse:-my-(--ui-breadcrumb-ring) in-data-collapse:py-(--ui-breadcrumb-ring) in-data-collapse:gap-y-0',
				'in-data-collapse:has-[>[data-slot=breadcrumb-item]~[data-slot=breadcrumb-item]]:ps-[calc(var(--ui-breadcrumb-mark)+var(--ui-breadcrumb-gap))]',
				'in-data-collapse:overflow-y-clip',
				'in-data-collapse:[--ui-breadcrumb-mark:0.75em] in-data-collapse:[--ui-breadcrumb-ring:--spacing(1)]',
				dan.gap.breadcrumb,
				dan.size.separator.room,
			],
			// In a collapsing trail, a crumb takes no height, so a wrapped line takes
			// none. The current page gives the first line its height and pushes each
			// wrapped line out of the clip. It is the one crumb that can be narrower than
			// its text, and only after each crumb before it has wrapped. After a crumb, it
			// leaves one gap on the line, so the separator before it stays on the line. A
			// trail of one crumb has no separator, so its crumb takes the whole line. A crumb after a
			// separator keeps the room of the separator at its start.
			item: [
				flex.inline,
				dan.gap.scale.sm,
				'in-data-collapse:flex-none in-data-collapse:-mb-[1lh]',
				'in-data-collapse:last:min-w-0 in-data-collapse:last:flex-initial',
				'in-data-collapse:not-first:last:max-w-[calc(100%-var(--ui-breadcrumb-gap))]',
				'in-data-collapse:last:mb-[calc(2*var(--ui-breadcrumb-ring))]',
				'in-data-collapse:[[data-slot=breadcrumb-separator]+&]:ps-(--ui-breadcrumb-separator)',
				'in-data-collapse:first:not-last:min-w-(--ui-breadcrumb-mark)',
				'in-data-collapse:first:not-last:-ms-[calc(var(--ui-breadcrumb-mark)+var(--ui-breadcrumb-gap))]',
			],
			link: {
				// In a collapsing trail, only the current page can be narrower than its
				// label, and the label clips at the end.
				base: [
					rounded.sm,
					focus.ring,
					'in-data-collapse:flex in-data-collapse:min-w-0 in-data-collapse:max-w-full',
				],
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
			},
			label: 'in-data-collapse:block in-data-collapse:min-w-0 in-data-collapse:truncate',
			// The `…` mark of a wrapped crumb comes up to the start of the line. The mark
			// of a crumb on the line goes above the clip. The mark of each wrapped crumb
			// is at the same place, and the last one is on top, so the pointer picks the
			// nearest hidden crumb. Only the mark of the first crumb draws its text,
			// because text that is drawn twice in one place looks heavier. A mark that the
			// pointer is on, or whose link has the focus, draws its text too, and the
			// focus ring of its link.
			mark: [
				"hidden after:content-['…']",
				'in-data-collapse:absolute in-data-collapse:start-0',
				'in-data-collapse:block in-data-collapse:w-(--ui-breadcrumb-mark)',
				'in-data-collapse:-mt-[calc(1lh+2*var(--ui-breadcrumb-ring))]',
				rounded.sm,
				focus.parent,
				'in-data-collapse:text-center',
				'in-data-collapse:[li:not(:first-child)_:not(:focus-visible)>&:not(:hover)]:text-transparent',
			],
			// In a collapsing trail, a separator takes no room on the line. It draws in
			// the room at the start of the crumb after it, so the two wrap together.
			separator: [
				...text.muted,
				dan.size.separator.svg,
				'in-data-collapse:flex in-data-collapse:flex-none in-data-collapse:items-center',
				'in-data-collapse:h-lh in-data-collapse:-me-(--ui-breadcrumb-separator) in-data-collapse:-mb-[1lh]',
			],
		},
		defaults: { current: false, interactive: false },
	},
	{ skeleton: kokkaku.breadcrumb },
)

/** Recipe variant props for a {@link Breadcrumb} link: its styling axes (`current`, `interactive`), for consumers composing custom slots. */
export type BreadcrumbLinkVariants = Omit<VariantProps<typeof k>, 'current' | 'interactive'> & {
	/** Whether the link goes to the current page. @defaultValue false */
	current?: VariantProps<typeof k>['current']
	/** Whether the crumb is a link, which darkens on hover. @defaultValue false */
	interactive?: VariantProps<typeof k>['interactive']
}
