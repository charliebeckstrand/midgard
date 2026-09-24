import { act } from '@testing-library/react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { useHydrated } from '../../hooks/use-hydrated'
import { attach, renderUI, screen } from '../helpers'

/** Renders the hook value as text, and records each value that a render reads. */
function Probe({ seen }: { seen?: boolean[] }) {
	const hydrated = useHydrated()

	seen?.push(hydrated)

	return <p>{hydrated ? 'client' : 'server'}</p>
}

describe('useHydrated', () => {
	it('is false on the server', () => {
		expect(renderToString(<Probe />)).toContain('server')
	})

	it('is true at once in a render that does not hydrate', () => {
		const seen: boolean[] = []

		renderUI(<Probe seen={seen} />)

		expect(seen[0]).toBe(true)

		expect(screen.getByText('client')).toBeInTheDocument()
	})

	it('is false in the hydration render, and true after it, with no mismatch', () => {
		const container = attach(document.createElement('div'))

		container.innerHTML = renderToString(<Probe />)

		const seen: boolean[] = []

		const onRecoverableError = vi.fn()

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, <Probe seen={seen} />, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(seen[0]).toBe(false)

		expect(seen.at(-1)).toBe(true)

		expect(container).toHaveTextContent('client')
	})
})
