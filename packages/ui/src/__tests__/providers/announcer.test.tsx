import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AnnouncerProvider, useAnnounce } from '../../providers/announcer'
import { renderUI, screen } from '../helpers'

const flush = () => act(async () => await Promise.resolve())

function Announcer({ message, assertive }: { message: string; assertive?: boolean }) {
	const announce = useAnnounce()

	return (
		<button type="button" onClick={() => announce(message, { assertive })}>
			go
		</button>
	)
}

function regionBy(politeness: 'polite' | 'assertive') {
	return document.body.querySelector<HTMLElement>(
		`[data-slot="live-region"][aria-live="${politeness}"]`,
	)
}

describe('AnnouncerProvider', () => {
	it('renders a polite and an assertive live region', () => {
		renderUI(
			<AnnouncerProvider>
				<span>child</span>
			</AnnouncerProvider>,
		)

		expect(regionBy('polite')).toBeInTheDocument()

		expect(regionBy('assertive')).toBeInTheDocument()
	})

	it('writes a polite message into the polite region', async () => {
		renderUI(
			<AnnouncerProvider>
				<Announcer message="Saved" />
			</AnnouncerProvider>,
		)

		act(() => screen.getByText('go').click())

		await flush()

		expect(regionBy('polite')).toHaveTextContent('Saved')
	})

	it('routes assertive messages to the assertive region', async () => {
		renderUI(
			<AnnouncerProvider>
				<Announcer message="Stop" assertive />
			</AnnouncerProvider>,
		)

		act(() => screen.getByText('go').click())

		await flush()

		expect(regionBy('assertive')).toHaveTextContent('Stop')

		expect(regionBy('polite')).toHaveTextContent('')
	})

	it('is an ambient no-op outside a provider', () => {
		// useAnnounce defaults to a no-op, so an un-wrapped consumer neither throws
		// nor creates a region.
		expect(() => renderUI(<Announcer message="Nothing" />)).not.toThrow()

		expect(regionBy('polite')).not.toBeInTheDocument()
	})
})
