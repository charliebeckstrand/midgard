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
 * "Copy" puts the log on the clipboard, so a report can carry the text.
 */

import { MousePointer } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Button } from '../../../components/button'
import { useCopyButtonState } from '../../../components/copy-button/use-copy-button-state'
import { Icon } from '../../../components/icon'
import { Sheet, SheetBody, SheetFooter, SheetTitle } from '../../../components/sheet'

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

	lines.push(`${time} z${scale} ${text}`)

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
			{/* The buttons go in the footer, because the grip covers the top edge of the sheet. */}
			<SheetFooter>
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
			</SheetFooter>
		</>
	)
}

/** The header button and the sheet of the log. `app.tsx` renders it only when the URL has `?taplog`. */
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
			{/* A bottom sheet takes the height of what it holds, and the log can be long.
			    The sheet thus opens at half the screen, and the grip changes the height. */}
			<Sheet side="bottom" handle open={open} onOpenChange={change} className="h-[50dvh]">
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

	if (users === 1) stop = listen()

	return () => {
		users -= 1

		if (users === 0) stop?.()
	}
}

/** Adds the listeners, and returns a function that removes them. */
function listen() {
	startTime = performance.now()

	const options = { capture: true, passive: true }

	for (const type of EVENTS) document.addEventListener(type, onEvent, options)

	const onResize = () => write('viewport resize')

	window.visualViewport?.addEventListener('resize', onResize)

	// A tap while the page still scrolls only stops the scroll on iOS. One line
	// for each scroll that starts shows such a tap.
	let scrolling = 0

	const onScroll = () => {
		if (paused) return

		if (!scrolling) write('scroll starts')

		clearTimeout(scrolling)

		scrolling = window.setTimeout(() => {
			scrolling = 0

			write('scroll ends')
		}, 150)
	}

	window.addEventListener('scroll', onScroll, options)

	const restoreChecked = watchCheckedWrites()

	write('tap log ready')

	return () => {
		for (const type of EVENTS) document.removeEventListener(type, onEvent, options)

		window.visualViewport?.removeEventListener('resize', onResize)

		window.removeEventListener('scroll', onScroll, options)

		clearTimeout(scrolling)

		restoreChecked?.()

		lines.length = 0

		group = null

		paused = false
	}
}
