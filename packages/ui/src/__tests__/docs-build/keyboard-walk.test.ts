import type { Page, Request } from 'playwright'
import { describe, it, type TestContext } from 'vitest'
import { launchChromium } from './helpers/chromium'
import { waitForIdleLoads } from './helpers/idle-loads'
import { loadBuildPage, openBuildTab, shardPaths } from './helpers/page-sweep'
import { settle } from './helpers/settle'

// The keyboard walk: this file presses Tab through each prerendered page of
// the build in Chromium, from the first Tab stop around to the first Tab stop
// again, and then presses Shift+Tab around the page. After each key, it reads
// the focus. It finds three defects:
//
// - A drop: the focus is on the body between two Tab stops. The reader sees
//   no focus, and the next Tab starts from a point that the reader cannot
//   see (WCAG 2.4.3, 2.4.7). The body is correct one time in each walk, when
//   the focus leaves the end of the page.
// - A covered stop: at the center of the part of the focused element in the
//   viewport, a box that paints is above the element. A sticky header or a
//   pinned column covers the focus, or the focus is off the screen (WCAG
//   2.4.11). A control in a label shows its focus on the label, so the label
//   is the element that must show.
// - A stop with no interactive role: the focused element is a Tab stop, but
//   its role, as Chromium computes it, is not a widget role. A screen reader
//   then reads a group or nothing at a Tab stop (WCAG 4.1.2, 2.4.3). A box
//   that scrolls is a correct Tab stop with any role, because the arrow keys
//   scroll it (WCAG 2.1.1).
//
// The walk runs in Chromium only. Blink makes an SVG `<g>` with a focus
// listener a Tab stop, which the other engines do not. The page loads at the
// width of a desktop, with reduced motion, as in `accessibility.test.ts`.

/** The time in ms in which no target of the page moves, before the walk. */
const QUIET = 500

/** The longest wait for the layout to settle, in ms. */
const SETTLE_LIMIT = 10_000

/** The longest wait in ms for the loads that the page starts in idle time. */
const IDLE_LIMIT = 20_000

/**
 * The most keys of one walk. A page with more Tab stops than this fails. A
 * press takes about 30 ms, so 1,000 presses take about 30 s. An incomplete walk
 * stops the walk back, so the case ends before its timeout.
 */
const MAX_STOPS = 1_000

/**
 * The roles that a Tab stop can have: the widget roles of WAI-ARIA 1.2, the
 * composite widget roles, whose element can hold the focus while
 * `aria-activedescendant` names the active item, and `tabpanel`. The tabs
 * pattern of the APG makes a panel a Tab stop when its first content cannot
 * take the focus.
 */
const INTERACTIVE = [
	'button',
	'checkbox',
	'columnheader',
	'combobox',
	'grid',
	'gridcell',
	'link',
	'listbox',
	'menu',
	'menubar',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'option',
	'radio',
	'radiogroup',
	'row',
	'rowheader',
	'scrollbar',
	'searchbox',
	'separator',
	'slider',
	'spinbutton',
	'switch',
	'tab',
	'tablist',
	'tabpanel',
	'textbox',
	'tree',
	'treegrid',
	'treeitem',
]

/** The findings of a defect or a design, and the pages that show them. */
type Entry = { finding: string; paths: readonly string[]; reason: string }

/**
 * The findings that a known defect of `ui` causes, by finding. A finding is
 * `drop from <stop>`, `covered <stop>`, or `role <role> <stop>`. A stop is
 * `<owner>/<name>`: its name is its `data-slot`, or its role or tag, and its
 * owner is the `data-slot` of the nearest ancestor that has one. The case
 * fails when a finding of a page is gone, so the page goes from the entry
 * with the fix. Each reason names the thread of the fix.
 */
const KNOWN: readonly Entry[] = []

/**
 * The Tab stops with a role that is not in `INTERACTIVE`, which the design
 * keeps on purpose, by finding, as in `KNOWN`. The case fails when a finding
 * of a page is gone, so the page goes from the entry with the change.
 */
const KEPT: readonly Entry[] = [
	{
		finding: 'role image chart-body/chart-plot',
		paths: [
			'/modules/chart',
			'/modules/chart/area',
			'/modules/chart/bubble',
			'/modules/chart/combo',
			'/modules/chart/donut',
			'/modules/chart/heatmap',
			'/modules/chart/line',
			'/modules/chart/pie',
			'/modules/chart/scatter',
			'/modules/chart/seat',
			'/modules/chat/citations',
			'/modules/chat/scope',
			'/modules/dashboard',
		],
		reason:
			'The plot of a chart with focus targets is a `role="img"` Tab stop. The arrow keys move its cursor, and the announcer speaks each point.',
	},
	{
		finding: 'role image map/map-plot',
		paths: [
			'/modules/chart/choropleth',
			'/modules/chat/citations',
			'/modules/map',
			'/modules/map/county',
			'/modules/map/geofence',
			'/modules/map/point',
		],
		reason: 'The plot of a map is a `role="img"` Tab stop, as the plot of a chart is.',
	},
	{
		finding: 'role image map-plot-box/map-plot',
		paths: ['/modules/map/point'],
		reason: 'The plot of a map is a `role="img"` Tab stop, as the plot of a chart is.',
	},
	{
		finding: 'role listitem list/list-item',
		paths: ['/list'],
		reason:
			'A row of a reorderable List is its own Tab stop, so that the keys of the reorder reach it.',
	},
	{
		finding: 'role time example-instance/time-ago',
		paths: ['/time-ago'],
		reason:
			'The tooltip example gives the `<time>` of TimeAgo `tabIndex={0}`, as its TSDoc tells, so that a focus opens the tooltip.',
	},
	{
		finding: 'role group menu/group',
		paths: ['/context-menu'],
		reason:
			'The content of each ContextMenu example holds no control, so the content is a named `group` Tab stop, as the ContextMenu TSDoc tells. A keyboard opens the menu from it.',
	},
	{
		finding: 'role generic menu/chat-message-bubble',
		paths: ['/modules/chat'],
		reason:
			'Where the message menu opens over the bubble, the bubble is a Tab stop, so that a keyboard opens the menu from it.',
	},
]

/** The keys of the two walks. */
const KEYS = ['Tab', 'Shift+Tab'] as const

type Key = (typeof KEYS)[number]

const PATHS = shardPaths()

// `computedRole` gives the role that the accessibility tree of Chromium holds.
const launch = launchChromium({ args: ['--enable-blink-features=ComputedAccessibilityInfo'] })

/** Opens a tab at the width of a desktop, with reduced motion. */
function openTab(context: TestContext): Promise<Page> {
	return openBuildTab(
		launch,
		{ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' },
		context,
	)
}

/** The focus after a key: the body, or an element with its findings. */
type Stop = { body: true } | ElementStop

/** A focus on an element, with its findings. */
type ElementStop = {
	body: false
	/** A number that is the same for the same element in each read of the page. */
	id: number
	/** The element as `<owner>/<name>`, as in `KNOWN`. */
	stop: string
	/** The accessible name of the element, for the message of a finding. */
	label: string
	/** The role of the element, when it is not a role that a Tab stop can have. */
	role?: string
	/** The box above the element, or the reason that it does not show. */
	cover?: string
}

/**
 * Reads the focus in the page after the next two frames, so that the work
 * that the focus starts in the page ends first: a render, the effects of the
 * render, and the focus fixup of Blink in the next frame. Give the function to
 * `page.evaluate`, with the roles of `INTERACTIVE`.
 */
async function readStop(interactive: readonly string[]): Promise<Stop> {
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

	const describeElement = (element: Element) => {
		const name =
			element.getAttribute('data-slot') ??
			element.getAttribute('role') ??
			element.tagName.toLowerCase()

		const owner = element.parentElement?.closest('[data-slot]')?.getAttribute('data-slot') ?? ''

		return `${owner}/${name}`
	}

	const element = document.activeElement

	if (
		!(element instanceof HTMLElement || element instanceof SVGElement) ||
		element === document.body
	) {
		return { body: true }
	}

	// The ids live in the page, so a read in a later evaluate finds the same id.
	const store = window as { walkIds?: Map<Element, number> }

	store.walkIds ??= new Map()

	const ids = store.walkIds

	const id = ids.get(element) ?? ids.size

	ids.set(element, id)

	// A control in a label, such as a radio of a Rating or a color swatch, shows
	// its focus on the label. So the label is the box that must show, and a part
	// of the label is not above the control. The touch target file uses the same
	// rule.
	const host = element.closest('label') ?? element

	// The center of the part of the box in the viewport. A box that is taller
	// than the viewport, such as an editor, shows its top part.
	const box = host.getBoundingClientRect()

	const left = Math.max(box.left, 0)

	const right = Math.min(box.right, innerWidth)

	const top = Math.max(box.top, 0)

	const bottom = Math.min(box.bottom, innerHeight)

	let cover: string | undefined

	if (right <= left || bottom <= top) {
		cover = 'nothing, off the screen'
	} else {
		// A hit test skips an element with no pointer events, such as a splitter
		// under its drag area. For the read, the host takes pointer events, so
		// that the stack holds it in its place.
		const { pointerEvents } = host.style

		host.style.setProperty('pointer-events', 'auto', 'important')

		const stack = document.elementsFromPoint((left + right) / 2, (top + bottom) / 2)

		host.style.pointerEvents = pointerEvents

		const at = stack.findIndex((item) => host.contains(item))

		// A box above the focus hides it only where the box paints: a fill, an
		// image, or its own text. A box that holds the focus is not above it.
		const paints = (item: Element) => {
			const style = getComputedStyle(item)

			return (
				!/^rgba\(.*, 0\)$|^transparent$/.test(style.backgroundColor) ||
				style.backgroundImage !== 'none' ||
				item.matches('img, svg, canvas, video, iframe, input, textarea, select') ||
				[...item.childNodes].some(
					(node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
				)
			)
		}

		const above =
			at === -1
				? stack.find((item) => !item.contains(host))
				: stack.slice(0, at).find((item) => !item.contains(host) && paints(item))

		if (above) cover = describeElement(above)
		else if (at === -1) cover = 'nothing, out of the view of its scroll box'
	}

	const { computedRole: role = '', computedName: name = '' } = element as Element & {
		computedRole?: string
		computedName?: string
	}

	// A box that scrolls takes the focus, so that the arrow keys scroll it
	// (WCAG 2.1.1). Its role can be any role.
	const style = getComputedStyle(element)

	const scrolls =
		(/auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight) ||
		(/auto|scroll/.test(style.overflowX) && element.scrollWidth > element.clientWidth)

	return {
		body: false,
		id,
		stop: describeElement(element),
		label: (name || element.textContent || '').trim().slice(0, 60),
		...(interactive.includes(role) || scrolls ? {} : { role: role || 'none' }),
		...(cover === undefined ? {} : { cover }),
	}
}

/** A finding and the stops that show it. */
type Finding = { finding: string; detail: string }

/** The loads of a tab: the count of the requests that started, and a wait for none in flight. */
type Loads = { started: () => number; idle: () => Promise<void> }

/** Counts the requests of the tab, and waits for the requests in flight to end. */
function trackLoads(tab: Page): Loads {
	let started = 0

	const inFlight = new Set<Request>()

	let waiters: (() => void)[] = []

	const done = (request: Request) => {
		inFlight.delete(request)

		if (inFlight.size > 0) return

		for (const resolve of waiters) resolve()

		waiters = []
	}

	tab.on('request', (request) => {
		started++

		inFlight.add(request)
	})

	tab.on('requestfinished', done)

	tab.on('requestfailed', done)

	return {
		started: () => started,
		idle: () =>
			inFlight.size === 0
				? Promise.resolve()
				: new Promise((resolve) => {
						waiters.push(resolve)
					}),
	}
}

/**
 * Presses `key`, and reads the focus after the work that the key starts ends.
 * A focus can start a load, such as the module of the tooltip state, and the
 * page changes the focus when the load ends. So when a request starts during
 * the read, the read waits for the loads to end, and reads the focus again.
 */
async function press(tab: Page, loads: Loads, key: Key): Promise<Stop> {
	// The count comes before the key, because the event of a request that the
	// key starts can come before the press returns.
	let before = loads.started()

	await tab.keyboard.press(key)

	for (;;) {
		const stop = await tab.evaluate(readStop, [...INTERACTIVE])

		if (loads.started() === before) return stop

		before = loads.started()

		await loads.idle()
	}
}

/** Gives the findings of a Tab stop that `key` reached: its role, and the box above it. */
function checkStop(stop: ElementStop, key: Key): Finding[] {
	const findings: Finding[] = []

	if (stop.role !== undefined) {
		findings.push({ finding: `role ${stop.role} ${stop.stop}`, detail: `"${stop.label}"` })
	}

	if (stop.cover !== undefined) {
		findings.push({
			finding: `covered ${stop.stop}`,
			detail: `${key} to "${stop.label}", under ${stop.cover}`,
		})
	}

	return findings
}

/** The findings of a walk, and whether the walk came back to the first stop. */
type Walk = { findings: Finding[]; complete: boolean }

/**
 * Presses `key` from the first Tab stop until the focus is on that stop
 * again, and gives the findings of the walk. A walk that reaches a stop a
 * second time before the first stop is a loop of the focus, and it stops.
 */
async function walk(tab: Page, loads: Loads, key: Key, first: number): Promise<Walk> {
	const findings: Finding[] = []

	const stops: Stop[] = []

	const seen = new Set<number>()

	for (let count = 0; count < MAX_STOPS; count++) {
		const stop = await press(tab, loads, key)

		if (!stop.body && stop.id === first) {
			// The focus leaves the end of the page one time: after the last stop of
			// a walk forward, and before it in a walk back.
			const end = key === 'Tab' ? stops.length - 1 : 0

			stops.forEach((item, at) => {
				if (!item.body || at === end) return

				// The element that the key left, which is the last element before the drop.
				const from = stops.slice(0, at).findLast((before): before is ElementStop => !before.body)

				findings.push({
					finding: `drop from ${from?.stop ?? 'the start'}`,
					detail: `${key} from "${from?.label ?? ''}" puts the focus on the body`,
				})
			})

			if (stops[end]?.body !== true) {
				findings.push({ finding: 'no end', detail: `${key} never leaves the end of the page` })
			}

			return { findings, complete: true }
		}

		stops.push(stop)

		if (stop.body) continue

		if (seen.has(stop.id)) {
			findings.push({
				finding: `loop at ${stop.stop}`,
				detail: `${key} brings the focus back to "${stop.label}" before the end of the page`,
			})

			return { findings, complete: false }
		}

		seen.add(stop.id)

		findings.push(...checkStop(stop, key))
	}

	findings.push({
		finding: 'no return',
		detail: `${MAX_STOPS} presses of ${key} do not bring the focus back to the first stop`,
	})

	return { findings, complete: false }
}

/**
 * Keeps the accessibility tree of the tab alive for the walk, through a
 * DevTools session that reads the tree one time.
 *
 * @remarks
 * Without a live tree, each read of `computedRole` or `computedName` builds a
 * tree of the whole page, and throws it away. On the dashboard page, that took
 * about 35 ms for each property, more than the two frames of a read. With the
 * tree alive, Chromium updates it as the page changes, and each read takes
 * about 1 ms. The roles and the names do not change.
 */
async function keepAccessibilityTree(tab: Page): Promise<void> {
	const session = await tab.context().newCDPSession(tab)

	const { root } = await session.send('DOM.getDocument', { depth: 0 })

	await session.send('Accessibility.getPartialAXTree', {
		nodeId: root.nodeId,
		fetchRelatives: false,
	})
}

/**
 * Walks the page at `route` forward and back, after its idle-time loads end
 * and its layout settles, and gives the findings of both walks.
 */
async function readPage(route: string, context: TestContext): Promise<Finding[]> {
	const tab = await openTab(context)

	await loadBuildPage(tab, route)

	await waitForIdleLoads(tab, { limit: IDLE_LIMIT })

	await tab.evaluate(settle, { quiet: QUIET, limit: SETTLE_LIMIT })

	// React renders a transition or a hydration in slices, and the boxes do not
	// move while it renders. A chart, for example, draws its plot and makes it a
	// Tab stop in such a render, after the layout settles. Each slice queues a
	// task, so the page has an idle period only after the render ends.
	await tab.evaluate(
		(limit) =>
			new Promise<void>((resolve) => {
				requestIdleCallback(() => resolve(), { timeout: limit })
			}),
		IDLE_LIMIT,
	)

	await keepAccessibilityTree(tab)

	const loads = trackLoads(tab)

	const start = await press(tab, loads, 'Tab')

	if (start.body) return [{ finding: 'no stop', detail: 'Tab puts the focus on no element' }]

	// Each walk ends when it reaches the first stop again, so the first stop
	// gets its checks here.
	const findings = checkStop(start, 'Tab')

	for (const key of KEYS) {
		const result = await walk(tab, loads, key, start.id)

		findings.push(...result.findings)

		// The walk back starts from the first stop, which an incomplete walk did not reach.
		if (!result.complete) break
	}

	return findings
}

// Each case opens its own tab, so the pages load side by side.
describe.concurrent('a prerendered page of the docs build, by keyboard', () => {
	it.for(PATHS)(
		'%s keeps the focus on a visible interactive element at each Tab stop',
		async (route, context) => {
			const { expect } = context

			const findings = await readPage(route, context)

			const known = [...KNOWN, ...KEPT]
				.filter((entry) => entry.paths.includes(route))
				.map((entry) => entry.finding)

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
