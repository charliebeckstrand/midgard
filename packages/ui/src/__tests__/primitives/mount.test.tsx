import { useEffect, useRef, useState } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { type Mount, MountHold, useMountHold, useMountsEveryPanel } from '../../primitives/mount'
import { mountsEveryPanel } from '../../primitives/mount/mount'
import { act, attach, renderUI, screen, setupUser } from '../helpers'

/**
 * The shared mount hold behind the current cascade, the disclosure panels, and
 * the grid's collapsible rows: which panels exist, which are wrapped in an
 * `<Activity>`, and when a wrapped one is hidden.
 */
describe('useMountHold', () => {
	/** A panel whose active state the test drives, reporting its own effect lifecycle. */
	function Panel({
		mount,
		defer = false,
		onSetup,
	}: {
		mount: Mount
		defer?: boolean
		onSetup?: (phase: 'setup' | 'cleanup') => void
	}) {
		const [active, setActive] = useState(false)

		const hold = useMountHold(active, mount, { defer })

		return (
			<>
				<button type="button" onClick={() => setActive((value) => !value)}>
					toggle
				</button>

				{/* Landing the deferred transition is the consumer's job; expose it. */}
				<button type="button" onClick={hold.rest}>
					land
				</button>

				{hold.present && (
					<MountHold hold={hold}>
						<Body onSetup={onSetup} />
					</MountHold>
				)}
			</>
		)
	}

	/** Reports its effect lifecycle, so a hide can be seen tearing effects down. */
	function Body({ onSetup }: { onSetup?: (phase: 'setup' | 'cleanup') => void }) {
		const report = useRef(onSetup)

		report.current = onSetup

		useEffect(() => {
			report.current?.('setup')

			return () => report.current?.('cleanup')
		}, [])

		return (
			<div data-testid="body">
				<input data-testid="field" defaultValue="" />
			</div>
		)
	}

	it('mount="active" unmounts the inactive panel', async () => {
		const user = setupUser()

		renderUI(<Panel mount="active" />)

		expect(screen.queryByTestId('body')).not.toBeInTheDocument()

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).toBeVisible()

		await user.click(screen.getByText('toggle'))

		expect(screen.queryByTestId('body')).not.toBeInTheDocument()
	})

	it('mount="always" holds the inactive panel hidden but mounted', async () => {
		const user = setupUser()

		renderUI(<Panel mount="always" />)

		// Present from the start, and hidden because it mounts inactive.
		expect(screen.getByTestId('body')).toBeInTheDocument()

		expect(screen.getByTestId('body')).not.toBeVisible()

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).toBeVisible()
	})

	it('mount="always" preserves DOM state across a hide', async () => {
		const user = setupUser()

		renderUI(<Panel mount="always" />)

		await user.click(screen.getByText('toggle'))

		await user.type(screen.getByTestId('field'), 'typed')

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).not.toBeVisible()

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId<HTMLInputElement>('field').value).toBe('typed')
	})

	it('mount="lazy" defers the panel until first activation, then holds it', async () => {
		const user = setupUser()

		renderUI(<Panel mount="lazy" />)

		expect(screen.queryByTestId('body')).not.toBeInTheDocument()

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).toBeVisible()

		await user.click(screen.getByText('toggle'))

		// Held from here on, not unmounted.
		expect(screen.getByTestId('body')).toBeInTheDocument()

		expect(screen.getByTestId('body')).not.toBeVisible()
	})

	it('tears effects down on hide and re-runs them on show', async () => {
		const user = setupUser()

		const onSetup = vi.fn()

		renderUI(<Panel mount="lazy" onSetup={onSetup} />)

		await user.click(screen.getByText('toggle'))

		expect(onSetup).toHaveBeenCalledWith('setup')

		onSetup.mockClear()

		await user.click(screen.getByText('toggle'))

		expect(onSetup).toHaveBeenCalledWith('cleanup')

		onSetup.mockClear()

		await user.click(screen.getByText('toggle'))

		expect(onSetup).toHaveBeenCalledWith('setup')
	})

	it('defers the hide until the caller lands the transition', async () => {
		const user = setupUser()

		renderUI(<Panel mount="always" defer />)

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).toBeVisible()

		// Going inactive leaves the panel live: `display: none` can't animate, so
		// the hold waits for the transition it would otherwise cut short.
		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).toBeVisible()

		await user.click(screen.getByText('land'))

		expect(screen.getByTestId('body')).not.toBeVisible()
	})

	it('wakes a rested panel in the same pass that reactivates it', async () => {
		const user = setupUser()

		renderUI(<Panel mount="always" defer />)

		await user.click(screen.getByText('toggle'))

		await user.click(screen.getByText('toggle'))

		await user.click(screen.getByText('land'))

		expect(screen.getByTestId('body')).not.toBeVisible()

		// No second landing is needed to undo the rest.
		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).toBeVisible()
	})

	it('rests an inactive panel when the policy starts to hold it', () => {
		const { rerender } = renderUI(<Panel mount="active" defer />)

		expect(screen.queryByTestId('body')).not.toBeInTheDocument()

		// The policy now holds the inactive panel, and no fade is in flight. The
		// panel must mount at rest, not visible.
		rerender(<Panel mount="always" defer />)

		expect(screen.getByTestId('body')).not.toBeVisible()
	})

	it('keeps an inactive held panel at rest when the hold starts to defer', () => {
		const { rerender } = renderUI(<Panel mount="always" />)

		expect(screen.getByTestId('body')).not.toBeVisible()

		// No close transition is in flight, so no landing arrives to rest it.
		rerender(<Panel mount="always" defer />)

		expect(screen.getByTestId('body')).not.toBeVisible()
	})
})

/**
 * The reading that a trigger takes before it points `aria-controls` at a panel
 * that it does not render. The server renders no hidden Activity, so the reading
 * waits for hydration.
 */
describe('useMountsEveryPanel', () => {
	/** Renders the reading as text, and records each value that a render reads. */
	function Probe({ mount, seen }: { mount: Mount; seen?: boolean[] }) {
		const everyPanel = useMountsEveryPanel(mount)

		seen?.push(everyPanel)

		return <p>{everyPanel ? 'every panel' : 'one panel'}</p>
	}

	it.each([
		['always', true],
		['lazy', false],
		['active', false],
	] as const)(
		'agrees with mountsEveryPanel for %s in a render that does not hydrate',
		(mount, expected) => {
			const seen: boolean[] = []

			renderUI(<Probe mount={mount} seen={seen} />)

			expect(seen[0]).toBe(expected)

			expect(mountsEveryPanel(mount)).toBe(expected)
		},
	)

	it('is false on the server under always', () => {
		expect(renderToString(<Probe mount="always" />)).toContain('one panel')
	})

	it('is false in the hydration render under always, and true after it, with no mismatch', () => {
		const container = attach(document.createElement('div'))

		container.innerHTML = renderToString(<Probe mount="always" />)

		const seen: boolean[] = []

		const onRecoverableError = vi.fn()

		let root: Root | undefined

		act(() => {
			root = hydrateRoot(container, <Probe mount="always" seen={seen} />, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(seen[0]).toBe(false)

		expect(seen.at(-1)).toBe(true)

		expect(container).toHaveTextContent('every panel')
	})
})
