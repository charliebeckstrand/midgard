import { devices, type Page } from 'playwright'
import { describe, inject, it, type TestContext } from 'vitest'
import { HYDRATED, prerenderedPages, STYLED } from '../../../scripts/docs/server'
import { launchChromium } from './helpers/chromium'
import { waitForIdleLoads } from './helpers/idle-loads'
import { settle } from './helpers/settle'

// The touch pitch rule (CONVENTIONS §3.10): on a coarse pointer, a finger
// that aims at a target does not reach another target. This file reads each
// prerendered page of the build in Chromium as an iPhone, which matches
// `(pointer: coarse)`. So each `TouchTarget` takes its coarse floor of 44 px.
//
// A target is a host that a reader can press, with the hit area of its
// `TouchTarget`. The file finds two defects:
//
// - An overlap: the hit areas of two targets overlap, so a tap in the overlap
//   goes to the target on top.
// - A crowded target: the hit area of a target is smaller than 44 px on an
//   axis, and a circle of 44 px at its center reaches another target, or the
//   circle of another small target. This is the spacing test of WCAG 2.5.8, at
//   the coarse floor.
//
// A target in another target, or in the same label, is part of that target,
// not a neighbor. An inline link in text is exempt, as in WCAG 2.5.8. axe
// reads the target size of a desktop (`accessibility.test.ts`), and this file
// reads the pitch of a phone.

/** The coarse floor of `TouchTarget` and of the touch pitch, in px. */
const FLOOR = 44

/**
 * The overlap in px on each axis above which two hit areas overlap. The
 * members of a `Group` share a border of 1 px, so a shared border is not an
 * overlap. WebKit measures that border a fraction of a pixel over 1 px, so the
 * margin keeps the result of the two engines the same.
 */
const SHARED_BORDER = 1.5

/** The time in ms in which no target of the page moves, before the read. */
const QUIET = 500

/** The longest wait for the layout to settle, in ms. */
const SETTLE_LIMIT = 10_000

/** The longest wait in ms for the loads that the page starts in idle time. */
const IDLE_LIMIT = 20_000

/**
 * The defects that a known defect of `ui` or of the docs causes, by finding.
 * A finding is `crowded <owner>/<target>` or `overlap <a> | <b>`. A target is
 * its `data-slot`, or its role or tag. Its owner is the `data-slot` of the
 * nearest ancestor that has one. The case fails when a finding of a page is
 * gone, so the page goes from the entry with the fix. Each comment names a
 * batch of the tap target work.
 */
const KNOWN: readonly { finding: string; paths: readonly string[]; reason: string }[] = [
	// Steppers and buttons in the end of a field.
	{
		finding: 'crowded suffix/button',
		paths: [
			'/address-input',
			'/copy-button',
			'/hold-button',
			'/modules/dashboard',
			'/modules/form/filters',
			'/modules/query',
			'/number-input',
			'/odometer',
			'/progress',
			'/progress/gauge',
			'/providers/glass',
			'/rating',
			'/shiny-text',
			'/signature-pad',
			'/slider',
			'/sparkline',
			'/textarea',
			'/tooltip',
		],
		reason:
			'The steppers of NumberInput are 28 px wide and touch. Most of these pages have one in an example.',
	},
	{
		finding: 'crowded suffix/copy-button',
		paths: ['/color'],
		reason: 'The copy button of ColorHexInput is 34 px wide, against its input.',
	},
	{
		finding: 'crowded textarea-actions/button',
		paths: [
			'/modules/chat/conversation',
			'/modules/chat/prompt',
			'/modules/chat/scope',
			'/textarea',
		],
		reason: 'An action of a Textarea is 38 px wide, against its text.',
	},
	{
		finding: 'overlap control-frame/chat-prompt | textarea-actions/button',
		paths: ['/modules/chat/conversation', '/modules/chat/prompt', '/modules/chat/scope'],
		reason: 'The hit area of the send button grows into the text of the prompt.',
	},
	{
		finding: 'overlap control-frame/textarea | textarea-actions/button',
		paths: ['/textarea'],
		reason: 'The hit area of an action grows into the text of the Textarea.',
	},
	{
		finding: 'overlap control-frame/color-hex-input | suffix/copy-button',
		paths: ['/color'],
		reason: 'The hit area of the copy button grows into the input.',
	},
	{
		finding: 'overlap control-frame/combobox-input | suffix/button',
		paths: ['/address-input'],
		reason: 'The hit area of the clear button grows into the input.',
	},
	{
		finding: 'overlap control-frame/date-input | suffix/button',
		paths: ['/date-input'],
		reason: 'The hit area of the clear button grows into the input.',
	},
	{
		finding: 'overlap control-frame/datepicker-input | suffix/button',
		paths: ['/date-picker', '/modules/grid/editing'],
		reason: 'The hit area of the calendar button grows into the input.',
	},
	{
		finding: 'overlap control-frame/file-upload-field | suffix/button',
		paths: ['/file-upload'],
		reason: 'The hit area of the browse button grows into the field.',
	},
	{
		finding: 'overlap control-frame/input | suffix/button',
		paths: ['/input', '/tag-input'],
		reason: 'The hit area of a suffix button grows into the input.',
	},
	{
		finding: 'overlap control-frame/password-input | suffix/button',
		paths: ['/modules/form', '/password-confirm', '/password-input', '/password-strength'],
		reason: 'The hit area of the reveal button grows into the input.',
	},
	{
		finding: 'overlap control-frame/input | flex/button',
		paths: ['/fieldset'],
		reason: 'The hit area of the info button of the example grows into the input below it.',
	},
	// Controls in a label.
	{
		finding: 'overlap field/control | field/control',
		paths: ['/modules/form'],
		reason:
			'The hit areas of two controls of the form example overlap, because the rows are closer than 44 px.',
	},
	{
		finding: 'crowded table-cell/control',
		paths: [
			'/modules/grid/editing',
			'/modules/grid/footer',
			'/modules/grid/pinning',
			'/modules/grid/selection',
		],
		reason: 'The select checkbox of a row is 20 px, with no touch floor, and the rows touch.',
	},
	{
		finding: 'crowded table-header/control',
		paths: [
			'/modules/grid/editing',
			'/modules/grid/footer',
			'/modules/grid/pinning',
			'/modules/grid/selection',
		],
		reason:
			'The select all checkbox of the header is 20 px, with no touch floor, against the first row.',
	},
	{
		finding: 'crowded switch-choice-track/switch-choice-zone',
		paths: ['/switch'],
		reason: 'The two zones of a SwitchChoice track are 19 × 24 px, and they touch.',
	},
	{
		finding: 'crowded color-swatches/color-swatch',
		paths: ['/color'],
		reason: 'A color swatch is 25 px, and the swatches are closer than 44 px.',
	},
	{
		finding: 'crowded color-panel/color-eyedropper',
		paths: ['/color'],
		reason: 'The eyedropper of the color panel is 38 px wide, beside the copy button.',
	},
	{
		finding: 'crowded rating/rating-star',
		paths: ['/rating'],
		reason: 'A star of Rating is 20 px, and the stars touch.',
	},
	{
		finding: 'crowded rating-star/rating-half',
		paths: ['/rating'],
		reason: 'A half of a star of Rating is 10 × 20 px, against the other half.',
	},
	// Chips and tags.
	{
		finding: 'crowded badge/button',
		paths: ['/tag-input'],
		reason: 'The remove button of a tag is 38 × 35 px, against the input.',
	},
	{
		finding: 'crowded control-frame/input',
		paths: ['/tag-input'],
		reason: 'The input of TagInput is 38 px tall, against the remove button of a tag.',
	},
	{
		finding: 'overlap badge/button | control-frame/input',
		paths: ['/tag-input'],
		reason: 'The hit area of the remove button of a tag grows into the input.',
	},
	{
		finding: 'overlap badge/button | suffix/button',
		paths: ['/tag-input'],
		reason: 'The hit areas of the remove button of a tag and of the add button overlap.',
	},
	{
		finding: 'crowded badge/query-chip-remove',
		paths: ['/modules/query'],
		reason: 'The remove button of a query chip is 39 × 38 px, beside the combinator.',
	},
	{
		finding: 'crowded query-chips/query-chips-combinator',
		paths: ['/modules/query'],
		reason: 'The combinator of the query chips is 41 × 38 px, beside a remove button.',
	},
	// Tabs and segments.
	{
		finding: 'crowded tab-list/tab',
		paths: ['/modules/query', '/segment'],
		reason: 'A tab of a Segment is 36 × 28 px, and the tabs touch.',
	},
	// Pagination.
	{
		finding: 'crowded pagination-list/pagination-page',
		paths: ['/pagination'],
		reason: 'A page button is 36 × 36 px, and the buttons touch.',
	},
	{
		finding: 'crowded pagination/pagination-next',
		paths: ['/modules/dashboard', '/modules/grid/pagination', '/pagination'],
		reason: 'The next button is 35 px wide, against the previous button.',
	},
	{
		finding: 'crowded pagination/pagination-previous',
		paths: ['/modules/dashboard', '/modules/grid/pagination', '/pagination'],
		reason: 'The previous button is 35 px wide, against the next button.',
	},
	// Toolbars.
	{
		finding: 'crowded toolbar/button',
		paths: ['/modules/grid/toolbar', '/pdf-viewer', '/toolbar'],
		reason: 'A toolbar button is 42 × 42 px, and the buttons touch.',
	},
	{
		finding: 'crowded toolbar-group/button',
		paths: ['/pdf-viewer', '/toolbar'],
		reason: 'A button of a toolbar group is 41 × 42 px, and the buttons touch.',
	},
	{
		finding: 'crowded toolbar-group/pdf-viewer-magnifier-settings-trigger',
		paths: ['/pdf-viewer'],
		reason: 'The magnifier button of PdfViewer is 41 × 42 px, in a toolbar group.',
	},
	{
		finding: 'crowded popover/pdf-viewer-search-trigger',
		paths: ['/pdf-viewer'],
		reason: 'The search button of PdfViewer is 42 × 42 px, beside the zoom buttons.',
	},
	{
		finding: 'crowded menu/button',
		paths: ['/modules/grid/toolbar', '/sidebar'],
		reason: 'A menu button is 42 × 42 px, beside a toolbar button or a sidebar row.',
	},
	{
		finding: 'crowded control-frame/listbox-button',
		paths: ['/pdf-viewer'],
		reason: 'The page select of PdfViewer is 33 × 38 px, in the toolbar.',
	},
	// Rows of a list or a tree.
	{
		finding: 'crowded json-node/json-node-toggle',
		paths: ['/json-tree'],
		reason: 'A row of JsonTree is 20 px tall, and the rows touch.',
	},
	{
		finding: 'crowded nav-item/nav-item-inner',
		paths: ['/nav'],
		reason: 'A row of Nav is 42 px tall, and the rows touch.',
	},
	{
		finding: 'crowded sidebar-item/sidebar-item-inner',
		paths: ['/sidebar'],
		reason: 'A row of Sidebar is 42 px tall, and the rows touch.',
	},
	{
		finding: 'overlap sidebar-item/sidebar-item-inner | sidebar-item/sidebar-item-inner',
		paths: ['/sidebar'],
		reason: 'The rows of the Sidebar examples overlap.',
	},
	{
		finding: 'crowded flex/button',
		paths: ['/sidebar'],
		reason: 'The new project button of the Sidebar example is 34 px tall, against a row.',
	},
	{
		finding: 'crowded chat-list-item/chat-list-item-select',
		paths: ['/modules/chat/list'],
		reason: 'The select area of a chat list row is 24 px tall, and the rows are closer than 44 px.',
	},
	{
		finding: 'crowded stepper-item/stepper-step',
		paths: ['/stepper'],
		reason: 'A step of the vertical Stepper is 18 px tall, and the steps are closer than 44 px.',
	},
	// Grid.
	{
		finding: 'crowded table-header/button',
		paths: [
			'/modules/grid/export',
			'/modules/grid/filters',
			'/modules/grid/groups',
			'/modules/grid/locking',
			'/modules/grid/pinning',
			'/modules/grid/reordering',
			'/modules/grid/toolbar',
			'/modules/grid/virtualization',
		],
		reason: 'The sort and filter buttons of a column header are 35 × 24 px, and they touch.',
	},
	{
		finding: 'overlap table-cell/button | table-cell/button',
		paths: ['/modules/grid/groups', '/modules/grid/virtualization'],
		reason: 'The hit areas of the buttons of two group rows overlap.',
	},
	{
		finding: 'overlap control-frame/grid-edit-input | table-cell/grid-new-row-add',
		paths: ['/modules/grid/editing'],
		reason: 'The hit area of the add button of the new row grows into the editor beside it.',
	},
	{
		finding: 'overlap flex/button | flex/button',
		paths: ['/modules/grid/editing', '/providers/density'],
		reason: 'The hit areas of the edit and delete buttons of a row overlap.',
	},
	// Dashboard tiles.
	{
		finding: 'crowded card-header/dashboard-tile-expand',
		paths: ['/modules/dashboard'],
		reason: 'The expand button of a tile is 26 px wide, against the view data button.',
	},
	{
		finding: 'crowded chart-header-actions/chart-view-data',
		paths: ['/modules/dashboard'],
		reason: 'The view data button of a chart is 26 px wide, against the expand button.',
	},
	// Chat.
	{
		finding: 'overlap chat-message-actions/button | chat-message-actions/copy-button',
		paths: ['/modules/chat'],
		reason: 'The actions of a message have no touch gap, so their hit areas overlap.',
	},
	{
		finding: 'overlap chat-message-actions/button | menu/button',
		paths: ['/modules/chat'],
		reason: 'The actions of a message have no touch gap, so their hit areas overlap.',
	},
	// PdfViewer.
	{
		finding: 'crowded pdf-viewer-highlights/button',
		paths: ['/pdf-viewer'],
		reason: 'A highlight of PdfViewer is 9 px tall, against the next highlight.',
	},
	// The docs.
	{
		finding: 'crowded collapse/collapse-trigger',
		paths: ['/modules/grid/virtualization', '/sidebar'],
		reason: 'The show code button of an example is 36 px tall, against the example.',
	},
	{
		finding: 'overlap collapse/collapse-trigger | sidebar-item/sidebar-item-inner',
		paths: ['/sidebar'],
		reason: 'The hit area of the show code button grows into the example.',
	},
	{
		finding: 'overlap collapse/collapse-trigger | table-cell/button',
		paths: ['/modules/grid/virtualization'],
		reason: 'The hit area of the show code button grows into the example.',
	},
]

/** The device of the read: a phone with a coarse pointer. */
const { defaultBrowserType: _, ...PHONE } = devices['iPhone 13']

const shard = inject('shard')

/**
 * The path of each prerendered page of the shard. The shards take the pages
 * in turn, as in `accessibility.test.ts`.
 */
const PATHS = prerenderedPages().filter((_, index) => index % shard.count === shard.index - 1)

const origin = inject('docsOrigin')

const launch = launchChromium()

/**
 * Opens a tab as a phone, with reduced motion, that loads only from the
 * server of the build. The tab closes after the case.
 */
async function openTab(context: TestContext): Promise<Page> {
	const tab = await launch({ ...PHONE, reducedMotion: 'reduce' }, context)

	await tab.route(
		(url) => url.origin !== origin,
		(route) => route.abort(),
	)

	return tab
}

/** A finding and the targets that show it. */
type Finding = { finding: string; detail: string }

/**
 * Reads the targets of the main region of the page, and gives each overlap
 * and each crowded target. Give the function to `page.evaluate`.
 */
function readTargets({ floor, sharedBorder }: { floor: number; sharedBorder: number }): Finding[] {
	const selector = [
		'button',
		// A control in a label, such as `Checkbox` or `Switch`, has the label as
		// its target.
		'label:has(input:not([type=hidden]))',
		'a[href]',
		'input:not([type=hidden])',
		'select',
		'textarea',
		'summary',
		'[role=button]',
		'[role=option]',
		'[role=tab]',
		'[role=menuitem]',
		'[role=checkbox]',
		'[role=radio]',
		'[role=switch]',
		'[role=slider]',
		'[role=gridcell][tabindex]',
	].join(', ')

	const main = document.querySelector('main') ?? document.body

	const isTarget = (element: Element) => {
		if (element.closest('[inert], [aria-hidden=true]')) return false

		// The label of an input in a label is its target.
		if (element.matches('input') && element.closest('label')) return false

		const style = getComputedStyle(element)

		if (style.visibility === 'hidden' || style.pointerEvents === 'none') return false

		// An inline link in text is exempt (WCAG 2.5.8).
		if (element.matches('a') && style.display === 'inline') return false

		const { width, height } = element.getBoundingClientRect()

		// A visually hidden control, such as the input of a file field, has a
		// box of 1 px. Its visible control is another target.
		return width * height > 1
	}

	const targets = [...main.querySelectorAll(selector)].filter(isTarget).map((element) => {
		let { left, top, right, bottom } = element.getBoundingClientRect()

		// The hit area of the target, and not of a target in it.
		const area = [...element.querySelectorAll('[data-slot=touch-target]')].find(
			(span) => span.parentElement?.closest(selector) === element,
		)

		if (area) {
			const box = area.getBoundingClientRect()

			left = Math.min(left, box.left)

			top = Math.min(top, box.top)

			right = Math.max(right, box.right)

			bottom = Math.max(bottom, box.bottom)
		}

		const name =
			element.getAttribute('data-slot') ??
			element.getAttribute('role') ??
			element.tagName.toLowerCase()

		const owner = element.parentElement?.closest('[data-slot]')?.getAttribute('data-slot') ?? ''

		const label = (element.getAttribute('aria-label') ?? element.textContent ?? '').trim()

		return {
			element,
			box: { left, top, right, bottom },
			id: `${owner}/${name}`,
			label: label.slice(0, 32),
		}
	})

	type Target = (typeof targets)[number]

	const related = (a: Target, b: Target) => {
		if (a.element.contains(b.element) || b.element.contains(a.element)) return true

		const label = a.element.closest('label')

		return label !== null && label === b.element.closest('label')
	}

	const overlaps = (a: Target['box'], b: Target['box']) =>
		Math.min(a.right, b.right) - Math.max(a.left, b.left) > sharedBorder &&
		Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > sharedBorder

	const distance = (x: number, y: number, box: Target['box']) =>
		Math.hypot(Math.max(box.left - x, 0, x - box.right), Math.max(box.top - y, 0, y - box.bottom))

	const size = ({ box }: Target) => ({ width: box.right - box.left, height: box.bottom - box.top })

	const isSmall = (target: Target) => {
		const { width, height } = size(target)

		return width < floor - 0.5 || height < floor - 0.5
	}

	const center = ({ box }: Target) => ({
		x: (box.left + box.right) / 2,
		y: (box.top + box.bottom) / 2,
	})

	const findings: Finding[] = []

	for (const [index, a] of targets.entries()) {
		const { width, height } = size(a)

		const small = isSmall(a)

		const { x, y } = center(a)

		let crowd: Target | undefined

		for (const [other, b] of targets.entries()) {
			if (other === index || related(a, b)) continue

			if (other > index && overlaps(a.box, b.box)) {
				const [first, second] = [a, b].sort((p, q) => p.id.localeCompare(q.id))

				findings.push({
					finding: `overlap ${first?.id} | ${second?.id}`,
					detail: `"${first?.label}" and "${second?.label}"`,
				})
			}

			// The circle of `a` reaches the box of `b`, or the circle of a small `b`.
			const reaches =
				distance(x, y, b.box) < floor / 2 - 0.5 ||
				(isSmall(b) && Math.hypot(center(b).x - x, center(b).y - y) < floor - 0.5)

			if (small && !crowd && reaches) crowd = b
		}

		if (crowd) {
			findings.push({
				finding: `crowded ${a.id}`,
				detail: `"${a.label}" is ${Math.round(width)} × ${Math.round(height)} px, beside ${crowd.id} "${crowd.label}"`,
			})
		}
	}

	return findings
}

/**
 * Reads the findings of the page at `route` as a phone, after its idle-time
 * loads end and its layout settles.
 */
async function readPage(route: string, context: TestContext): Promise<Finding[]> {
	const tab = await openTab(context)

	await tab.goto(`${origin}${route}`)

	await tab.waitForFunction(HYDRATED)

	await tab.waitForFunction(STYLED)

	await tab.waitForLoadState('networkidle')

	await waitForIdleLoads(tab, { limit: IDLE_LIMIT })

	await tab.evaluate(settle, { quiet: QUIET, limit: SETTLE_LIMIT })

	return tab.evaluate(readTargets, { floor: FLOOR, sharedBorder: SHARED_BORDER })
}

// Each case opens its own tab, so the pages load side by side.
describe.concurrent('a prerendered page of the docs build, on a phone', () => {
	it.for(PATHS)(
		'%s keeps each target out of the reach of a finger on another',
		async (route, context) => {
			const { expect } = context

			const findings = await readPage(route, context)

			const known = KNOWN.filter((entry) => entry.paths.includes(route)).map(
				(entry) => entry.finding,
			)

			const found = [
				...new Set(
					findings
						.filter((item) => !known.includes(item.finding))
						.map((item) => `${item.finding}: ${item.detail}`),
				),
			]

			expect(found).toEqual([])

			const gone = known.filter((finding) => !findings.some((item) => item.finding === finding))

			expect(gone, 'these known findings are gone, so remove the page from their entries').toEqual(
				[],
			)
		},
	)
})
