import { describeTarget, isOwn } from '../events-target'
import type { EventSource } from '../types'
import { nextBatch, on } from './dom'

const INPUT = [
	'touchstart',
	'touchend',
	'touchcancel',
	'pointerdown',
	'pointerup',
	'pointercancel',
	'mousedown',
	'mouseup',
	'click',
	'focusin',
	'keydown',
	'input',
	'change',
	'submit',
]

/** The modifier keys, by the flag of a keyboard event that holds each. */
const MODIFIERS = [
	['ctrlKey', 'Control'],
	['altKey', 'Alt'],
	['shiftKey', 'Shift'],
	['metaKey', 'Meta'],
] as const

/** A key and its modifiers, such as `Shift+Tab`. A modifier that is the key itself goes out of the modifiers. */
function chord(event: KeyboardEvent): string {
	const key = event.key === ' ' ? 'Space' : event.key

	const modifiers = MODIFIERS.filter(([flag, name]) => event[flag] && name !== event.key)

	return [...modifiers.map(([, name]) => name), key].join('+')
}

/** The events that start a gesture: a press of a pointer or of a key. */
const GESTURE_STARTS = new Set(['pointerdown', 'keydown'])

/** The events that end a gesture. A gesture with no end ends at the next start. */
const GESTURE_ENDS = new Set(['click', 'pointercancel'])

/**
 * The input events, the keys with their modifiers, and each default that a
 * script cancels. The events of one gesture, from its start to its end, are
 * one batch, such as the eight events of a tap from `pointerdown` to `click`.
 */
export const input: EventSource = (note) => {
	let gesture: string | undefined

	return on(document, INPUT, (event) => {
		if (isOwn(event.target)) return

		if (GESTURE_STARTS.has(event.type)) gesture = nextBatch()

		const batch = gesture

		if (GESTURE_ENDS.has(event.type)) gesture = undefined

		const isKeyboard = event instanceof KeyboardEvent

		const keyText = isKeyboard ? ` ${chord(event)}` : ''

		const synthetic = event.isTrusted ? '' : ' synthetic'

		note({
			kind: 'input',
			text: `${event.type}${keyText} ${describeTarget(event.target)}${synthetic}`,
			detail: isKeyboard ? { key: event.key, code: event.code, repeat: event.repeat } : undefined,
			batch,
		})

		// The listeners of the target run after this capture listener.
		setTimeout(
			() =>
				event.defaultPrevented && note({ kind: 'input', text: `${event.type} cancelled`, batch }),
		)
	})
}
