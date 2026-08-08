import { useEffect, useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Hold, type Mount, useMountHold } from '../../primitives/mount'
import { renderUI, screen, userEvent } from '../helpers'

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
					<Hold hold={hold}>
						<Body onSetup={onSetup} />
					</Hold>
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
		const user = userEvent.setup({ delay: null })

		renderUI(<Panel mount="active" />)

		expect(screen.queryByTestId('body')).not.toBeInTheDocument()

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).toBeVisible()

		await user.click(screen.getByText('toggle'))

		expect(screen.queryByTestId('body')).not.toBeInTheDocument()
	})

	it('mount="always" holds the inactive panel hidden but mounted', async () => {
		const user = userEvent.setup({ delay: null })

		renderUI(<Panel mount="always" />)

		// Present from the start, and hidden because it mounts inactive.
		expect(screen.getByTestId('body')).toBeInTheDocument()

		expect(screen.getByTestId('body')).not.toBeVisible()

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).toBeVisible()
	})

	it('mount="always" preserves DOM state across a hide', async () => {
		const user = userEvent.setup({ delay: null })

		renderUI(<Panel mount="always" />)

		await user.click(screen.getByText('toggle'))

		await user.type(screen.getByTestId('field'), 'typed')

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).not.toBeVisible()

		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId<HTMLInputElement>('field').value).toBe('typed')
	})

	it('mount="lazy" defers the panel until first activation, then holds it', async () => {
		const user = userEvent.setup({ delay: null })

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
		const user = userEvent.setup({ delay: null })

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
		const user = userEvent.setup({ delay: null })

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
		const user = userEvent.setup({ delay: null })

		renderUI(<Panel mount="always" defer />)

		await user.click(screen.getByText('toggle'))

		await user.click(screen.getByText('toggle'))

		await user.click(screen.getByText('land'))

		expect(screen.getByTestId('body')).not.toBeVisible()

		// No second landing is needed to undo the rest.
		await user.click(screen.getByText('toggle'))

		expect(screen.getByTestId('body')).toBeVisible()
	})
})
