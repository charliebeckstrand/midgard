import { defineKata } from '../../core/recipe'
import { dan, iro, ji, kokkaku } from '../kiso'

const { text } = iro
const { weight } = ji

/**
 * The list is a grid in each orientation, and the orientations differ only in
 * their columns and the gutter of a term. `orientation` is a responsive axis:
 * each of its values writes the same properties, so a breakpoint replaces each
 * one.
 *
 * The list projects its layout onto direct `dt` and `dd` children. Term and
 * details are static leaves that carry only their text styling, so neither
 * child reads context and both render in React Server Components. The
 * direct-child selectors keep a nested `<DescriptionList>` inside a `dd`
 * independent.
 *
 * The text and the block padding take the step of the nearest density scope.
 * At `md` the text is `text-sm`, and each term after the first has `pt-4` above
 * it in each orientation. Under its term, the details have `pt-1`. Beside its
 * term, the details have no top padding, and they align to the first baseline
 * of the term (`items-baseline`). The `pe-2` gutter of a horizontal term keeps
 * one size, because no stepped utility writes `padding-inline-end`.
 */
const base = [
	'grid items-baseline',
	dan.text.small,
	'[&>dt]:col-start-1',
	dan.space.term.top,
	dan.space.detail.top,
].join(' ')

export const k = defineKata(
	{
		base,
		/**
		 * The classes of each orientation. Tailwind scans whole class literals, and
		 * `ui/tailwind.css` lists each prefixed form in an `@source inline(...)` line.
		 */
		responsive: {
			orientation: {
				horizontal: 'grid-cols-[min(50%,--spacing(56))_auto] [&>dt]:pe-2 [&>dt+dd]:pt-0',
				vertical: 'grid-cols-1 [&>dt]:pe-0 [&>dt+dd]:pt-(--ui-details-top)',
			},
		},
		slots: {
			term: [text.muted, weight.medium],
			details: text.default,
		},
	},
	{ skeleton: kokkaku.descriptionList },
)
