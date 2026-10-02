/**
 * An on-screen log of the touch, pointer, mouse, and form events of each tap.
 * Open the docs with `?taplog` to show it. It is for touch bugs that occur
 * only on a real device, such as an iOS tap that shows the press but does not
 * select a Radio.
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
 * "Copy" puts the log on the clipboard, so a report can carry the text. The
 * panel can shrink to its title bar. The log does not show the taps and
 * scrolls on the panel itself.
 */

import { Maximize2, Minimize2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '../../components/button'
import { useCopyButtonState } from '../../components/copy-button/use-copy-button-state'
import { Icon } from '../../components/icon'
import { cn } from '../../core/cn'
import { usePanelResize } from '../../hooks/use-panel-resize'
import { PanelHandle } from '../../primitives/panel/panel-handle'
import { k as sheet } from '../../recipes/kata/sheet'

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

let panel: HTMLDivElement | undefined

/** The panel calls these when the lines change. */
const listeners = new Set<() => void>()

/** The log text, newest line first. */
let logText = ''

let start = 0

/** The last radio group that a tap touched; the state lines read its radios. */
let group: Element | null = null

/** True while the state lines of the current tap wait; a label click and its input click then write them one time. */
let statePending = false

function write(text: string) {
	const time = Math.round(performance.now() - start)

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

/** True for a target in the panel. The log does not show its own taps and scrolls. */
function inPanel(target: EventTarget | null) {
	return target instanceof Node && Boolean(panel?.contains(target))
}

function onEvent(event: Event) {
	if (inPanel(event.target)) return

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

/** Writes a line when a script, and not the user, sets `checked` on a radio. */
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

/** The padding keeps the bar and the lines out of the round corners of a phone screen. */
const corners = 'pb-[max(env(safe-area-inset-bottom),--spacing(4))]'

function TapLogPanel() {
	const log = useSyncExternalStore(subscribe, () => logText)

	const [open, setOpen] = useState(true)

	// The grip of a bottom Sheet. The log takes 25% of the screen, and the grip
	// makes it taller, up to 75%. A swipe down shrinks it to its bar. The hook
	// lives here and not in the panel, so the height stays while the log is a bar.
	const resize = usePanelResize({
		side: 'bottom',
		open: true,
		onDismiss: () => setOpen(false),
		floorOf: () => window.innerHeight * 0.25,
		ceilingOf: (_, viewport) => viewport * 0.75,
	})

	// The clipboard gets the lines in time order, oldest first.
	const { copied, copy } = useCopyButtonState({ text: lines.join('\n') })

	const bar = (
		<div className="flex shrink-0 items-center gap-2 px-5 py-2">
			<span className="me-auto font-semibold text-base">Tap log</span>
			{open && (
				<>
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
				</>
			)}
			<Button
				size="sm"
				variant="plain"
				aria-label={open ? 'Minimize' : 'Maximize'}
				onClick={() => setOpen(!open)}
			>
				<Icon icon={open ? <Minimize2 /> : <Maximize2 />} />
			</Button>
		</div>
	)

	// The log and its bar slide in and out with the motion of a bottom Sheet. A
	// minimize and a swipe down both set `open` to false, so both play the exit.
	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					key="log"
					{...sheet.motion.bottom}
					ref={resize.ref}
					style={resize.size === null ? undefined : { height: resize.size }}
					className={cn(
						'dark fixed inset-x-0 bottom-0 z-[2147483647] flex h-[25dvh] flex-col bg-zinc-950 pt-6 text-white',
						corners,
					)}
				>
					<PanelHandle
						slot="sheet-handle"
						orientation="horizontal"
						handleProps={resize.handleProps}
						covers={resize.covers}
						className={cn(sheet.handle.area, sheet.handle.side.bottom)}
						bar={cn(sheet.handle.bar.horizontal)}
					/>
					{bar}
					<pre className="m-0 min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-5 font-mono text-[10px]/[1.3] text-green-400">
						{log}
					</pre>
				</motion.div>
			) : (
				// The top padding is equal to the bottom padding, so the bar is in the
				// vertical center.
				<motion.div
					key="bar"
					{...sheet.motion.bottom}
					className={cn(
						'dark fixed inset-x-0 bottom-0 z-[2147483647] bg-zinc-950 pt-[max(env(safe-area-inset-bottom),--spacing(4))] text-white',
						corners,
					)}
				>
					{bar}
				</motion.div>
			)}
		</AnimatePresence>
	)
}

/** Mounts the log. `main.tsx` loads this module only when the URL has `?taplog`. */
export function mountTapLog() {
	start = performance.now()

	panel = document.createElement('div')

	document.body.append(panel)

	createRoot(panel).render(<TapLogPanel />)

	for (const type of EVENTS)
		document.addEventListener(type, onEvent, { capture: true, passive: true })

	window.visualViewport?.addEventListener('resize', () => write('viewport resize'))

	// A tap while the page still scrolls only stops the scroll on iOS. One line
	// for each scroll that starts shows such a tap.
	let scrolling = 0

	window.addEventListener(
		'scroll',
		(event) => {
			if (inPanel(event.target)) return

			if (!scrolling) write('scroll starts')

			clearTimeout(scrolling)

			scrolling = window.setTimeout(() => {
				scrolling = 0

				write('scroll ends')
			}, 150)
		},
		{ capture: true, passive: true },
	)

	watchCheckedWrites()

	write('tap log ready')
}
