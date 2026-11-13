import { describeTarget, isOwn, isSecret, MASK } from '../events-target'
import type { EventSource } from '../types'
import { addListeners, nextBatch } from './dom'

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

/**
 * Whether a key is a named key of UI Events, such as `Enter`, `Tab`, or `F1`.
 * Each named key is a word in this form. Each other key types text, which
 * can be more than one code point, such as a cluster of an Indic layout.
 */
function isNamedKey(key: string): boolean {
	return /^[A-Z][A-Za-z0-9]+$/.test(key)
}

/**
 * Whether the events mask the key of a keyboard event: a key that types text
 * into a password field.
 */
function isMasked(event: KeyboardEvent): boolean {
	return isSecret(event.target) && !isNamedKey(event.key)
}

/**
 * A key and its modifiers, such as `Shift+Tab`. A modifier that is the key
 * itself goes out of the modifiers. A masked key is {@link MASK}.
 */
function formatChord(event: KeyboardEvent): string {
	if (isMasked(event)) return MASK

	const key = event.key === ' ' ? 'Space' : event.key

	const modifiers = MODIFIERS.filter(([flag, name]) => event[flag] && name !== event.key)

	return [...modifiers.map(([, name]) => name), key].join('+')
}

/** The detail of a keyboard event. The key and the code of a masked key are {@link MASK}. */
function getKeyDetail(event: KeyboardEvent) {
	return isMasked(event)
		? { key: MASK, code: MASK, repeat: event.repeat }
		: { key: event.key, code: event.code, repeat: event.repeat }
}

/** The events that start a gesture: a press of a pointer or of a key. */
const GESTURE_STARTS = new Set(['pointerdown', 'keydown'])

/** The events that end a gesture. A gesture with no end ends at the next start. */
const GESTURE_ENDS = new Set(['click', 'pointercancel'])

/**
 * The input events, the keys with their modifiers, and each default that a
 * script cancels. The events of one gesture, from its start to its end, are
 * one batch, such as the eight events of a tap from `pointerdown` to `click`.
 *
 * @internal
 */
export const input: EventSource = (note) => {
	let gesture: string | undefined

	return addListeners(document, INPUT, (event) => {
		if (isOwn(event.target)) return

		if (GESTURE_STARTS.has(event.type)) gesture = nextBatch()

		const batch = gesture

		if (GESTURE_ENDS.has(event.type)) gesture = undefined

		const isKeyboard = event instanceof KeyboardEvent

		const keyText = isKeyboard ? ` ${formatChord(event)}` : ''

		const synthetic = event.isTrusted ? '' : ' synthetic'

		note({
			kind: 'input',
			text: `${event.type}${keyText} ${describeTarget(event.target)}${synthetic}`,
			detail: isKeyboard ? getKeyDetail(event) : undefined,
			batch,
		})

		// The listeners of the target run after this capture listener.
		setTimeout(
			() =>
				event.defaultPrevented && note({ kind: 'input', text: `${event.type} cancelled`, batch }),
		)
	})
}
