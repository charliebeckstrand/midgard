import { describe, expect, it } from 'vitest'
import { defineKata } from '../../core/recipe'
import { HeadlessShell } from '../../primitives/headless/headless-shell'
import { useHeadlessSlots } from '../../primitives/headless/use-headless-slots'
import { HeadlessProvider, useHeadless } from '../../providers/headless'
import { renderUI, screen } from '../helpers'

function Probe() {
	return <span data-slot="probe">{String(useHeadless())}</span>
}

describe('HeadlessProvider', () => {
	it('useHeadless defaults to false outside a provider', () => {
		renderUI(<Probe />)

		expect(screen.getByText('false')).toBeInTheDocument()
	})

	it('sets the headless flag for descendants', () => {
		renderUI(
			<HeadlessProvider>
				<Probe />
			</HeadlessProvider>,
		)

		expect(screen.getByText('true')).toBeInTheDocument()
	})

	it('renders children without adding a host element', () => {
		const { container } = renderUI(
			<HeadlessProvider>
				<span data-slot="child" />
			</HeadlessProvider>,
		)

		const child = container.querySelector('[data-slot="child"]')

		expect(child?.parentElement).toBe(container)
	})

	it('gives the bare output of a unit under the provider, and its slots outside', () => {
		const unit = defineKata({ base: 'frame', slots: { field: 'reset' } })

		function Slots() {
			const slots = useHeadlessSlots(unit)

			return <span data-slot="slots">{`${slots.base}|${slots.field}`}</span>
		}

		const { unmount } = renderUI(<Slots />)

		expect(screen.getByText('frame|reset')).toBeInTheDocument()

		unmount()

		renderUI(
			<HeadlessProvider>
				<Slots />
			</HeadlessProvider>,
		)

		expect(screen.getByText('|')).toBeInTheDocument()
	})

	it('drops the element of a HeadlessShell under the provider and keeps its content', () => {
		const { container, unmount } = renderUI(
			<HeadlessShell data-slot="shell">
				<b>content</b>
			</HeadlessShell>,
		)

		expect(container.querySelector('[data-slot="shell"] > b')).not.toBeNull()

		unmount()

		const headless = renderUI(
			<HeadlessProvider>
				<HeadlessShell data-slot="shell">
					<b>content</b>
				</HeadlessShell>
			</HeadlessProvider>,
		)

		expect(headless.container.querySelector('[data-slot="shell"]')).toBeNull()

		expect(screen.getByText('content').parentElement).toBe(headless.container)
	})
})
