import { noop } from '../../../../utilities/noop'
import { framesOf } from '../events-probes'
import { describeTarget, isOwn } from '../events-target'
import type { EventSource } from '../types'
import { all } from './dom'

const CALLS: readonly [object, string][] = [
	[window, 'scrollTo'],
	[window, 'scrollBy'],
	[window, 'scroll'],
	[Element.prototype, 'scrollTo'],
	[Element.prototype, 'scrollBy'],
	[Element.prototype, 'scroll'],
	[Element.prototype, 'scrollIntoView'],
	[HTMLElement.prototype, 'focus'],
]

/**
 * The one patch of the store: each script call that scrolls or moves the
 * focus, with the first two frames of its caller. The detail holds the full
 * stack. It runs only when the app asks for it, because it replaces methods
 * of the page.
 */
export const calls: EventSource = (note) =>
	all(
		CALLS.map(([owner, name]) => {
			const original: unknown = Reflect.get(owner, name)

			if (typeof original !== 'function') return noop

			Reflect.set(owner, name, function (this: unknown, ...args: unknown[]) {
				if (!isOwn(this)) {
					// The first frame is this function.
					const stack = framesOf(new Error().stack).slice(1)

					note({
						kind: 'call',
						text: `${name} ${describeTarget(this)} ${JSON.stringify(args)} from ${stack.slice(0, 2).join(' < ')}`,
						detail: { stack },
					})
				}

				return Reflect.apply(original, this, args)
			})

			return () => Reflect.set(owner, name, original)
		}),
	)
