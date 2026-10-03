/**
 * An on-screen log of the touch, pointer, mouse, and form events of each tap.
 * Turn it on in the Debug section of the settings. It is for touch bugs that
 * occur only on a real device, such as an iOS tap that shows the press but
 * does not select a Radio.
 *
 * While the tool is on, a pointer button in the header, next to the settings
 * button, opens the log in a bottom Sheet. The log records from the page load,
 * while the sheet is closed. It does not record the taps on the button, and it stops
 * while the sheet is open. It starts again at the first tap after the sheet
 * closes, so the tap that closes the sheet does not go in the log.
 *
 * Each tap writes one block. The block gives each event in order, its target,
 * and whether a script cancelled it. On iOS, a tap that sends `mouseover` and
 * `mousemove` but no `mousedown` is a tap that the page took as a hover, and a
 * `transitionrun` line shows a transition that the hover started. After the
 * click, the block gives each radio of the tapped group two times: in the DOM
 * (`checked`) and in the computed style of its dot, after the click and two
 * frames later. A script write to `checked` on a radio also writes a line.
 * Thus the log shows which step fails: no click, a click that does not check
 * the radio, a check that a script undoes, or a check that the page does not
 * paint.
 *
 * Each line also gives the scroll position of the page (`y`). A scroll gives
 * the element that scrolls, or `page`. A script call that scrolls or moves
 * the focus (`scrollTo`, `scrollBy`, `scroll`, `scrollIntoView`, `focus`)
 * writes a line with its target and the first frames of its caller, and a
 * change to the height of the page writes a line. Thus the log shows what
 * moves the page when no tap occurs.
 *
 * "Copy" puts the log on the clipboard, so a report can carry the text.
 */

import { MousePointer } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Button } from '../../../components/button'
import { useCopyButtonState } from '../../../components/copy-button/use-copy-button-state'
import { Icon } from '../../../components/icon'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetTitle } from '../../../components/sheet'
import { subscribeOverlaySignal } from '../../../primitives/overlay'

const EVENTS = [
	'touchstart',
	'touchend',
	'touchcancel',
	'pointerdown',
	'pointerup',
	'pointercancel',
	'mouseover',
	'mousemove',
	'mousedown',
	'mouseup',
	'click',
	'input',
	'change',
	'focusin',
	'contextmenu',
	'selectstart',
	'transitionrun',
] as const

const lines: string[] = []

/** True while the sheet is open, and after it closes until the next tap starts. */
let paused = false

/** True while the sheet is open. */
let sheetOpen = false

/** The `data-slot` of the header button. */
const TRIGGER = 'tap-log-trigger'

/** The sheet calls these when the lines change. */
const listeners = new Set<() => void>()

/** The log text, newest line first. */
let logText = ''

let startTime = 0

/** The last radio group that a tap touched; the state lines read its radios. */
let group: Element | null = null

/** True while the state lines of the current tap wait; a label click and its input click then write them one time. */
let statePending = false

function write(text: string) {
	const time = Math.round(performance.now() - startTime)

	const scale = (window.visualViewport?.scale ?? 1).toFixed(2)

	lines.push(`${time} z${scale} y${Math.round(window.scrollY)} ${text}`)

	if (lines.length > 300) lines.shift()

	logText = lines.slice().reverse().join('\n')

	for (const listener of listeners) listener()
}

function describe(target: EventTarget | null) {
	if (!(target instanceof Element)) return String(target)

	const slot = target.getAttribute('data-slot')

	const value = target instanceof HTMLInputElement && target.value ? `=${target.value}` : ''

	return `${target.tagName.toLowerCase()}${slot ? `[${slot}]` : ''}${value}`
}

/** The name of the target of a scroll or of a scroll call: `page` for the document or the window. */
function scrollTarget(target: EventTarget | null) {
	return target === document || target === window || target === document.documentElement
		? 'page'
		: describe(target)
}

/**
 * The sizes of the two viewports and the focused element: the height of the
 * layout viewport (`inner`), the height and the top of the visual viewport
 * (`visual`), and `focus` when an element other than the body has the focus.
 */
function viewport() {
	const visual = window.visualViewport

	const box = visual ? ` visual ${Math.round(visual.height)}@${Math.round(visual.offsetTop)}` : ''

	const active = document.activeElement

	const focus = active && active !== document.body ? ` focus ${describe(active)}` : ''

	return `inner ${window.innerHeight}${box}${focus}`
}

/** The first two frames of the caller of a patched method, with the file names cut to the last part. */
function caller() {
	return (new Error().stack ?? '')
		.split('\n')
		.map((frame) => frame.trim())
		.filter((frame) => frame && frame !== 'Error' && !frame.includes('tap-log'))
		.slice(0, 2)
		.map((frame) => frame.replace(/https?:\/\/[^\s)]*\//g, ''))
		.join(' < ')
}

type Patch = { owner: object; name: string; original: unknown }

/**
 * Writes a line when a script scrolls the page or an element, or moves the
 * focus. The return value puts the native methods back.
 */
function watchScrollCalls() {
	const patches: Patch[] = []

	const patch = (owner: object, name: string) => {
		const original: unknown = Reflect.get(owner, name)

		if (typeof original !== 'function') return

		patches.push({ owner, name, original })

		Reflect.set(owner, name, function (this: unknown, ...args: unknown[]) {
			if (!paused) {
				const detail = args.length ? ` ${JSON.stringify(args)}` : ''

				write(`  script ${name} ${scrollTarget(this as EventTarget)}${detail} from ${caller()}`)
			}

			return Reflect.apply(original as (...rest: unknown[]) => unknown, this, args)
		})
	}

	for (const name of ['scrollTo', 'scrollBy', 'scroll']) patch(window, name)

	for (const name of ['scrollTo', 'scrollBy', 'scroll', 'scrollIntoView'])
		patch(Element.prototype, name)

	patch(HTMLElement.prototype, 'focus')

	return () => {
		for (const { owner, name, original } of patches) Reflect.set(owner, name, original)
	}
}

function radios() {
	return group ? [...group.querySelectorAll<HTMLInputElement>('input[type=radio]')] : []
}

/** One character for each radio: `X` checked, `.` not checked. */
function domState() {
	return radios()
		.map((radio) => (radio.checked ? 'X' : '.'))
		.join('')
}

/** One character for each radio, from the computed opacity of its dot: `X` shown, `.` hidden. */
function styleState() {
	return radios()
		.map((radio) => {
			const dot = radio.nextElementSibling

			if (!dot) return '?'

			return Number(getComputedStyle(dot).opacity) > 0.5 ? 'X' : '.'
		})
		.join('')
}

function state(label: string) {
	if (!group) return

	write(`  ${label}: dom ${domState()} style ${styleState()}`)
}

/** True for an event that the log does not show: a tap on the header button, or an event while the log is paused. */
function skip(event: Event) {
	// A new tap after the sheet closes starts the log again.
	if (paused && !sheetOpen && (event.type === 'touchstart' || event.type === 'pointerdown'))
		paused = false

	if (paused) return true

	return event.target instanceof Element && Boolean(event.target.closest(`[data-slot=${TRIGGER}]`))
}

function onEvent(event: Event) {
	if (skip(event)) return

	if (event.type === 'touchstart') {
		write('──── tap')

		const target = event.target instanceof Element ? event.target : null

		group = target?.closest('[role=radiogroup]') ?? group
	}

	const where =
		event instanceof MouseEvent ? ` @${Math.round(event.clientX)},${Math.round(event.clientY)}` : ''

	const trusted = event.isTrusted ? '' : ' synthetic'

	const property = event instanceof TransitionEvent ? ` ${event.propertyName}` : ''

	write(`${event.type} ${describe(event.target)}${property}${where}${trusted}`)

	// Listeners on the target run after this capture listener; the check waits for them.
	setTimeout(() => {
		if (event.defaultPrevented) write(`  ${event.type} cancelled`)
	})

	if (event.type === 'click' && !statePending) {
		statePending = true

		setTimeout(() => {
			state('after click')

			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					state('2 frames later')

					statePending = false
				}),
			)
		})
	}
}

/** Writes a line when a script, and not the user, sets `checked` on a radio. The return value puts the native setter back. */
function watchCheckedWrites() {
	const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')

	if (!descriptor?.get || !descriptor.set) return

	const { get, set } = descriptor

	Object.defineProperty(HTMLInputElement.prototype, 'checked', {
		configurable: true,
		get() {
			return get.call(this)
		},
		set(next: boolean) {
			// The first renders set `checked` on each radio; the log starts at the first tap.
			if (this.type === 'radio' && group)
				write(`  script sets checked=${next} on ${describe(this)}`)

			set.call(this, next)
		},
	})

	return () => Object.defineProperty(HTMLInputElement.prototype, 'checked', descriptor)
}

function subscribe(listener: () => void) {
	listeners.add(listener)

	return () => {
		listeners.delete(listener)
	}
}

function clear() {
	lines.length = 0

	write('cleared')
}

/** The lines of the open sheet. It reads the store only while it is open, so the closed log does not render for each event. */
function TapLogLines() {
	const log = useSyncExternalStore(subscribe, () => logText)

	// The clipboard gets the lines in time order, oldest first.
	const { copied, copy } = useCopyButtonState({ text: lines.join('\n') })

	return (
		<>
			<SheetTitle>Tap log</SheetTitle>
			<SheetBody className="min-h-0 flex-1 overflow-auto">
				<pre className="m-0 whitespace-pre-wrap font-mono text-[10px]/[1.3]">{log}</pre>
			</SheetBody>
			<SheetFooter className="justify-between">
				<div className="flex gap-2">
					<Button
						size="sm"
						variant="soft"
						color={copied ? 'green' : undefined}
						onClick={() => void copy()}
					>
						{copied ? 'Copied' : 'Copy'}
					</Button>
					<Button size="sm" variant="soft" onClick={clear}>
						Clear
					</Button>
				</div>
				<SheetClose>
					<Button size="sm" variant="plain">
						Close
					</Button>
				</SheetClose>
			</SheetFooter>
		</>
	)
}

/** The header button and the sheet of the log. `DebugActions` renders it while the tool is on. */
export function TapLog() {
	const [open, setOpen] = useState(false)

	// The log records while the tool is on. Off, the tool unmounts and the log stops.
	useEffect(start, [])

	const change = (next: boolean) => {
		sheetOpen = next

		if (next) paused = true

		setOpen(next)
	}

	return (
		<>
			<Button variant="bare" data-slot={TRIGGER} aria-label="Tap log" onClick={() => change(true)}>
				<Icon icon={<MousePointer />} />
			</Button>
			{/* The sheet takes the height of the log, up to the height of the screen.
			    A longer log scrolls in the body. */}
			<Sheet side="bottom" open={open} onOpenChange={change} className="max-h-full">
				<TapLogLines />
			</Sheet>
		</>
	)
}

/** The count of the mounted {@link TapLog} instances. The layout renders the header actions two times, one for each width. */
let users = 0

let stop: (() => void) | undefined

/** Starts the log at the first mount, and stops it at the last unmount. */
function start() {
	users += 1

	if (users === 1) stop ??= listen()

	return () => {
		users -= 1

		if (users === 0) {
			stop?.()

			stop = undefined
		}
	}
}

/**
 * The box that a fixed surface takes, from `useVisualViewport`: its value on the
 * root element, or `-` when it is not set.
 */
function frameState() {
	const height = document.documentElement.style.getPropertyValue('--visual-viewport-height')

	const top = document.documentElement.style.getPropertyValue('--visual-viewport-top')

	return height === '' ? '-' : `${parseFloat(height)}@${parseFloat(top)}`
}

/** The viewport units that the probe measures, one child box for each. */
const UNITS = ['svh', 'dvh', 'lvh'] as const

/**
 * Makes the probe: a box fixed to the layout viewport, with one child box for
 * each viewport unit and one for the safe-area insets. Its height is where
 * `bottom: 0` puts a fixed surface, which a browser toolbar can cover.
 */
function makeProbe() {
	const probe = document.createElement('div')

	probe.setAttribute('aria-hidden', 'true')

	probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none'

	for (const unit of UNITS) {
		const box = probe.appendChild(document.createElement('div'))

		box.style.cssText = `position:absolute;top:0;width:1px;height:100${unit}`
	}

	const insets = probe.appendChild(document.createElement('div'))

	insets.style.cssText =
		'position:absolute;top:0;width:1px;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'

	return probe
}

/**
 * The heights that decide where a surface fixed to an edge sits: the visual
 * viewport (height at offset), the window, the root element, a box fixed to the
 * layout viewport (height at top), the viewport units, the safe-area insets (top
 * and bottom), the scroll offset, the screen, and the frame of
 * `useVisualViewport`.
 */
function viewportState(probe: HTMLElement) {
	const viewport = window.visualViewport

	const visual = viewport ? `${Math.round(viewport.height)}@${Math.round(viewport.offsetTop)}` : '-'

	const box = probe.getBoundingClientRect()

	const fixed = `${Math.round(box.height)}@${Math.round(box.top)}`

	const [svh, dvh, lvh, insets] = Array.from(probe.children, (child) => getComputedStyle(child))

	const units = [svh, dvh, lvh]
		.map((style) => Math.round(parseFloat(style?.height ?? '')))
		.join('/')

	const safe = `${parseFloat(insets?.paddingTop ?? '')}/${parseFloat(insets?.paddingBottom ?? '')}`

	return `vv ${visual} win ${window.innerHeight} doc ${document.documentElement.clientHeight} fixed ${fixed} s/d/lvh ${units} safe ${safe} y ${Math.round(window.scrollY)} screen ${window.screen.height} frame ${frameState()}`
}

/** Adds the listeners, and returns a function that removes them. */
function listen() {
	startTime = performance.now()

	const options = { capture: true, passive: true }

	for (const type of EVENTS) document.addEventListener(type, onEvent, options)

	const probe = makeProbe()

	document.body.append(probe)

	const onResize = () => write(`viewport resize ${viewportState(probe)}`)

	const onWindowResize = () => write(`window resize ${viewportState(probe)}`)

	window.visualViewport?.addEventListener('resize', onResize)

	window.addEventListener('resize', onWindowResize)

	// The frame of `useVisualViewport` changes when an overlay opens or the
	// toolbar moves. One line for each change shows what a surface was given.
	let frame = frameState()

	const frames = new MutationObserver(() => {
		const next = frameState()

		if (next === frame) return

		frame = next

		write(`frame ${viewportState(probe)}`)
	})

	frames.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

	// An overlay that opens reads the frame. The line shows the readings at that
	// moment, also when the frame stays the full screen and no frame line comes.
	const stopOverlays = subscribeOverlaySignal(() => {
		if (!paused) write(`overlay opens ${viewportState(probe)}`)
	})

	// A tap while the page still scrolls only stops the scroll on iOS. One line
	// for each scroll that starts shows such a tap.
	let scrolling = 0

	const onScroll = (event: Event) => {
		if (paused) return

		if (!scrolling) write(`scroll starts ${scrollTarget(event.target)} ${viewport()}`)

		clearTimeout(scrolling)

		scrolling = window.setTimeout(() => {
			scrolling = 0

			write('scroll ends')
		}, 150)
	}

	window.addEventListener('scroll', onScroll, options)

	const restoreChecked = watchCheckedWrites()

	const restoreScrollCalls = watchScrollCalls()

	let height = 0

	const heights = new ResizeObserver(() => {
		const next = Math.round(document.documentElement.scrollHeight)

		if (next === height) return

		height = next

		if (!paused) write(`page height ${next}`)
	})

	heights.observe(document.documentElement)

	write(`tap log ready ${viewportState(probe)}`)

	return () => {
		for (const type of EVENTS) document.removeEventListener(type, onEvent, options)

		window.visualViewport?.removeEventListener('resize', onResize)

		window.removeEventListener('resize', onWindowResize)

		frames.disconnect()

		stopOverlays()

		probe.remove()

		window.removeEventListener('scroll', onScroll, options)

		clearTimeout(scrolling)

		restoreChecked?.()

		restoreScrollCalls()

		heights.disconnect()

		lines.length = 0

		group = null

		paused = false
	}
}

// The module loads before the first render of the app, while the tool is on
// (`preloadDebugTools`). The log starts here and not at the first mount, so it
// also records a focus or a scroll in the first commit, before the first paint.
// The first mount takes this run of the listeners.
stop = listen()
