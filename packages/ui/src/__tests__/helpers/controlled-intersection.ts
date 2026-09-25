import { act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { vi } from 'vitest'

/**
 * A controlled `IntersectionObserver` for the suites of a mount policy, and the
 * server markup that such a policy renders.
 *
 * Not re-exported from `helpers/index.ts`. Only the suites of the chat embeds
 * and of the dashboard mount policy use this module.
 */

/** The controls of the observer that {@link installControlledObserver} installs. */
export type ControlledObserver = {
	/**
	 * Reports each observed target as in or out of view. Each target stays
	 * under observation, as it does during a scroll.
	 */
	report: (isIntersecting: boolean) => void
	/** Reports each observed target as in view once, and then forgets it. */
	reveal: () => void
	/** The number of targets that the observers watched. */
	observed: () => number
}

/**
 * Stubs `IntersectionObserver`, so that nothing intersects until the test says
 * so.
 *
 * @remarks
 * The jsdom setup reports each target as in view when an observer watches it.
 * A suite that states the deferral of a mount policy replaces that stub with
 * this one. `unstubGlobals` puts the setup stub back before the next test, so
 * no caller restores it.
 *
 * @returns The controls of the observer.
 */
export function installControlledObserver(): ControlledObserver {
	const targets: { target: Element; callback: IntersectionObserverCallback }[] = []

	let observed = 0

	class Observer {
		private readonly callback: IntersectionObserverCallback

		constructor(callback: IntersectionObserverCallback) {
			this.callback = callback
		}

		observe(target: Element) {
			observed += 1

			targets.push({ target, callback: this.callback })
		}

		unobserve() {}
		disconnect() {}
		takeRecords() {
			return []
		}
	}

	vi.stubGlobal('IntersectionObserver', Observer)

	const send = (entries: typeof targets, isIntersecting: boolean) => {
		act(() => {
			for (const { target, callback } of entries) {
				callback(
					[{ target, isIntersecting } as IntersectionObserverEntry],
					{} as IntersectionObserver,
				)
			}
		})
	}

	return {
		report: (isIntersecting) => send(targets, isIntersecting),
		reveal: () => send(targets.splice(0), true),
		observed: () => observed,
	}
}

/**
 * The server markup of `element`.
 *
 * @remarks
 * A server has no `IntersectionObserver`, and `useInView` reports each target
 * as visible there. So the markup renders with no observer. The `finally` puts
 * the observer back, because a hydration in the same case needs it.
 *
 * @param element - The element to render.
 * @returns The markup.
 */
export function serverMarkup(element: ReactElement): string {
	const observer = window.IntersectionObserver

	Reflect.deleteProperty(window, 'IntersectionObserver')

	try {
		return renderToString(element)
	} finally {
		window.IntersectionObserver = observer
	}
}
