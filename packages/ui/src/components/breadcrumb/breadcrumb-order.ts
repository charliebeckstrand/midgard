/**
 * The most items (crumbs and separators) of a collapsing trail that the order
 * rule gives a place: sixteen crumbs and the separators between them.
 */
const PLACES = 31

/**
 * The style rule that lays out the items of a collapsing trail from the current
 * page back to the first crumb. A flex line takes its items in `order`, so the
 * line holds the crumbs nearest the current page, and the crumbs before them
 * wrap. The `flex-direction` of the list (`row-reverse`) draws the items in the
 * order of the document again. An item past the last place takes the last
 * place, so it wraps before each item that has a place.
 *
 * The rule is the same for each trail, and it holds no value from a measure.
 * Thus the server paints the fit.
 * @internal
 */
export const BREADCRUMB_ORDER_RULE = Array.from(
	{ length: PLACES },
	(_, index) =>
		`[data-collapse] [data-slot=breadcrumb-list]>:nth-last-child(${index + 1}){order:${index + 1}}`,
).join('')
