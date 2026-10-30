import { onTestFinished, vi } from 'vitest'

/**
 * Sets `document.elementFromPoint` for the current case, so that each point
 * names `target` as the element under it.
 *
 * @remarks
 * jsdom has no layout and no `elementFromPoint`, so no method exists for
 * `vi.spyOn`, and `restoreMocks` cannot remove the stub. The removal runs in
 * `onTestFinished`, so it also runs after a case that times out. An
 * `afterEach` does not have that guarantee.
 *
 * A second call in the same case replaces the stub.
 *
 * @param target - The element that each point gives, or `null` for no element.
 * @returns The stub, so a case can read its calls.
 */
export function stubElementFromPoint(target: Element | null) {
	const stub = vi.fn<(x: number, y: number) => Element | null>(() => target)

	Object.defineProperty(document, 'elementFromPoint', {
		configurable: true,
		writable: true,
		value: stub,
	})

	onTestFinished(() => {
		Reflect.deleteProperty(document, 'elementFromPoint')
	})

	return stub
}
