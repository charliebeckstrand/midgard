/**
 * How many leading crumbs of a collapsing trail give way to their mark, so the
 * row at `nav` holds the trail and whatever follows it on the line.
 *
 * Reads the label and the mark that every `BreadcrumbLink` renders. It answers
 * from what the row shows now plus what each box gives back: a range over a
 * label reports the full width of its text, also when the label is closed to
 * nothing. Thus the answer is the same in every state of the row. The collapse that the answer causes
 * cannot change the answer, so the measure does not oscillate, and the server's
 * markup gives the answer that the hook later finds.
 *
 * The last crumb is the current page. It never gives way, and it clips at the
 * end of the row after every crumb above it has gone to its mark.
 *
 * @remarks
 * The function refers to nothing outside its own body, because the pre-paint
 * script of `Breadcrumb` carries its source text. Keep it so.
 *
 * @param nav - The `<nav>` of the trail, whose width is the room.
 * @returns The number of leading crumbs that show their mark.
 * @internal
 */
export function breadcrumbFit(nav: HTMLElement): number {
	// The smallest width that layout keeps (1/64 px): a row short by less than
	// this paints as a fit.
	const unit = 1 / 64

	const labels = nav.querySelectorAll<HTMLElement>('[data-slot=breadcrumb-label]')
	const marks = nav.querySelectorAll<HTMLElement>('[data-slot=breadcrumb-mark]')

	const last = labels.length - 1

	// One crumb is a current page with nothing above it to give way.
	if (last < 1 || marks.length !== labels.length) return 0

	// Widths in the units of the box, never rounded: an integer width such as
	// `clientWidth` can hide a fraction of a pixel that clips the current page.
	const width = (element: Element) => element.getBoundingClientRect().width

	// The full width of a label's text, whatever its box shows.
	const text = (label: HTMLElement) => {
		const range = document.createRange()

		range.selectNodeContents(label)

		return range.getBoundingClientRect().width
	}

	const box = nav.getBoundingClientRect()

	const room = box.width

	// What the row would take with every label whole and no mark shown: what it
	// takes now, to the end of what follows the list, plus the width each label
	// is short of its text, less the marks.
	const edge = (nav.lastElementChild ?? labels.item(last)).getBoundingClientRect()

	// The row runs from the start edge, which is the right in a right-to-left trail.
	let need =
		getComputedStyle(nav).direction === 'rtl' ? box.right - edge.left : edge.right - box.left

	for (let at = 0; at <= last; at++) {
		need += text(labels.item(at)) - width(labels.item(at)) - width(marks.item(at))
	}

	let collapsed = 0

	// Leftmost first, and never the last crumb. The mark is drawn from CSS, so a
	// range cannot read it; its `scrollWidth` reads its full width when closed.
	while (collapsed < last && need - room >= unit) {
		need -= Math.max(0, text(labels.item(collapsed)) - marks.item(collapsed).scrollWidth)
		collapsed++
	}

	return collapsed
}

/**
 * The style rule that shows the mark of the first `collapsed` crumbs of the
 * trail marked `data-collapse={id}`, and closes their labels.
 *
 * @remarks
 * The function refers to nothing outside its own body, because the pre-paint
 * script of `Breadcrumb` carries its source text. Keep it so. The rule is not a
 * design: the classes of `BreadcrumbLink` hold the look, and the rule only
 * switches which of the two boxes of a crumb has width.
 *
 * @param id - The value of the trail's `data-collapse` attribute.
 * @param collapsed - The number of leading crumbs that show their mark.
 * @param when - A selector that must match an ancestor of the trail for the
 * rule to apply, with a space after it. The pre-paint step writes one rule for
 * each answer, and each rule applies only while the answer is its own.
 * @returns The rule, or an empty string when no crumb gives way.
 * @internal
 */
export function breadcrumbFitRule(id: string, collapsed: number, when = ''): string {
	if (collapsed < 1) return ''

	const crumbs = `${when}[data-collapse="${id}"] [data-slot=breadcrumb-item]:nth-child(-n+${collapsed} of [data-slot=breadcrumb-item])`

	return `${crumbs} [data-slot=breadcrumb-label]{max-width:0}${crumbs} [data-slot=breadcrumb-mark]{max-width:none}`
}
