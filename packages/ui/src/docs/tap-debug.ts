// TEMPORARY: a tap log for the iOS Radio bug in PR #1404. Remove before merge.
// Open the docs with `?tapdebug` to show it.

const lines: string[] = []

const box = document.createElement('pre')

box.style.cssText =
	'position:fixed;left:0;right:0;bottom:0;z-index:99999;max-height:45vh;overflow:auto;margin:0;padding:6px;font:10px/1.3 ui-monospace,monospace;background:rgba(0,0,0,.85);color:#0f0;white-space:pre-wrap;pointer-events:auto'

const start = performance.now()

const radios = () =>
	[...document.querySelectorAll<HTMLInputElement>('input[type=radio]')]
		.slice(0, 3)
		.map((r) => (r.checked ? '●' : '○'))
		.join('')

function log(text: string) {
	lines.push(
		`${Math.round(performance.now() - start)} z${(visualViewport?.scale ?? 1).toFixed(2)} ${text} ${radios()}`,
	)

	if (lines.length > 200) lines.shift()

	box.textContent = lines.slice().reverse().join('\n')
}

function nameOf(target: EventTarget | null) {
	if (!(target instanceof Element)) return String(target)

	const slot = target.getAttribute('data-slot')

	const value = target instanceof HTMLInputElement ? `=${target.value}` : ''

	return `${target.tagName.toLowerCase()}${slot ? `[${slot}]` : ''}${value}`
}

for (const type of [
	'touchstart',
	'touchend',
	'touchcancel',
	'pointerdown',
	'pointerup',
	'pointercancel',
	'mousedown',
	'mouseup',
	'click',
	'input',
	'change',
	'focusin',
	'contextmenu',
	'selectstart',
]) {
	document.addEventListener(
		type,
		(event) => {
			const where =
				event instanceof MouseEvent
					? ` @${Math.round(event.clientX)},${Math.round(event.clientY)}`
					: ''

			log(`${type} ${nameOf(event.target)}${where}${event.isTrusted ? '' : ' (synthetic)'}`)

			setTimeout(() => {
				if (event.defaultPrevented) log(`  ${type} was prevented`)
			})
		},
		{ capture: true },
	)
}

for (const key of ['checked', 'defaultChecked'] as const) {
	const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, key)

	if (!descriptor?.set || !descriptor.get) continue

	const { get, set } = descriptor

	Object.defineProperty(HTMLInputElement.prototype, key, {
		configurable: true,
		get() {
			return get.call(this)
		},
		set(next: boolean) {
			if (this.type === 'radio') log(`  js sets ${key}=${next} on ${this.value}`)

			set.call(this, next)
		},
	})
}

let last = ''

function watch() {
	const now = radios()

	if (now !== last) {
		last = now

		log('state')
	}

	requestAnimationFrame(watch)
}

requestAnimationFrame(watch)

document.body.append(box)

log('tap log ready')

export {}
