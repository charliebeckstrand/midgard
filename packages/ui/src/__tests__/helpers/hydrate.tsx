import { act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { type Mock, type MockInstance, onTestFinished, vi } from 'vitest'
import { attach } from './attach'

/** The spies and the root of a hydration, for the assertions of a case. */
type Hydration = {
	/** The `onRecoverableError` option of the root. React calls it for a mismatch that it recovers from. */
	onRecoverableError: Mock
	/** A spy on `console.error`, where React reports an attribute mismatch. */
	consoleError: MockInstance<typeof console.error>
	/** The hydrated root. A case renders a new element into it with `root.render`. */
	root: Root
}

/**
 * Hydrates `element` over the server markup in `container`, in `act`, and
 * unmounts the root when the case finishes.
 *
 * @param container - The node that holds the server markup.
 * @param element - The element that the client renders.
 */
export function hydrate(container: Element, element: ReactNode): Hydration {
	const onRecoverableError = vi.fn()

	const consoleError = vi.spyOn(console, 'error')

	let root: Root | undefined

	act(() => {
		root = hydrateRoot(container, element, { onRecoverableError })
	})

	onTestFinished(() => act(() => root?.unmount()))

	if (!root) throw new Error('expected a root')

	return { onRecoverableError, consoleError, root }
}

/**
 * Renders `element` on the server into a container on the body, then hydrates
 * the same element over that markup ({@link hydrate}).
 *
 * @returns The spies, the root, the container, and the server markup.
 */
export function hydrateServerRender(
	element: ReactNode,
): Hydration & { container: HTMLElement; html: string } {
	const html = renderToString(element)

	const container = attach(document.createElement('div'))

	container.innerHTML = html

	return { container, html, ...hydrate(container, element) }
}

/** The server markup of `element`, in a node outside the document. */
export function serverMarkup(element: ReactNode): HTMLElement {
	const markup = document.createElement('div')

	markup.innerHTML = renderToString(element)

	return markup
}
