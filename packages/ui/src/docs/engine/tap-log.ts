/**
 * An on-screen log of the touch, pointer, mouse, and form events of each tap.
 * Open the docs with `?taplog` to show it. It is for touch bugs that occur
 * only on a real device, such as an iOS tap that shows the press but does not
 * select a Radio.
 *
 * Each tap writes one block. The block gives each event in order, its target,
 * and whether a script cancelled it. On iOS, a tap that sends `mouseover` and
 * `mousemove` but no `mousedown` is a tap that the page took as a hover, and a
 * `transitionrun` line shows a transition that the hover started. After the click, the block gives each
 * radio of the tapped group two times: in the DOM (`checked`) and in the
 * computed style of its dot, after the click and two frames later. A script
 * write to `checked` on a radio also writes a line. Thus the log shows which
 * step fails: no click, a click that does not check the radio, a check that
 * a script undoes, or a check that the page does not paint.
 *
 * "Copy" puts the log on the clipboard, so a report can carry the text.
 */

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

let output: HTMLPreElement | undefined

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

	if (output) output.textContent = lines.slice().reverse().join('\n')
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

function button(text: string, onClick: () => void) {
	const element = document.createElement('button')

	element.type = 'button'

	element.textContent = text

	element.className = 'rounded bg-white/15 px-2 py-0.5'

	element.addEventListener('click', onClick)

	return element
}

/** Mounts the log. `main.tsx` loads this module only when the URL has `?taplog`. */
export function mountTapLog() {
	start = performance.now()

	panel = document.createElement('div')

	panel.className =
		'fixed inset-x-0 bottom-0 z-[2147483647] flex max-h-[45vh] flex-col bg-black/85 font-mono text-[10px]/[1.3] text-green-400'

	const bar = document.createElement('div')

	bar.className = 'flex gap-2 p-1.5'

	bar.append(
		button('Copy', () => void navigator.clipboard?.writeText(lines.join('\n'))),
		button('Clear', () => {
			lines.length = 0

			write('cleared')
		}),
	)

	output = document.createElement('pre')

	output.className = 'm-0 overflow-auto whitespace-pre-wrap p-1.5'

	panel.append(bar, output)

	document.body.append(panel)

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
