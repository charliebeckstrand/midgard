import { describe, expect, it } from 'vitest'
import { DocDescription } from '../../../../docs/components/api-reference/doc-description'
import { bySlot, renderUI, screen } from '../../../helpers'

describe('DocDescription', () => {
	it('passes link-free descriptions straight through Markdown', () => {
		const { container } = renderUI(<DocDescription description="Plain `code` prose." />)

		expect(bySlot(container, 'markdown')).toBeInTheDocument()

		expect(bySlot(container, 'doc-description')).not.toBeInTheDocument()
	})

	it('renders a resolved `{@link}` as the bare component name, not a badge', () => {
		const { container } = renderUI(
			<DocDescription description="Hint for a {@link CommandPaletteItem}, built on Kbd." />,
		)

		expect(bySlot(container, 'doc-description')).toBeInTheDocument()

		// The reference collapses to plain text in flow — no badge chip, no hover
		// card trigger.
		expect(bySlot(container, 'badge')).not.toBeInTheDocument()

		expect(screen.queryByRole('button')).not.toBeInTheDocument()

		expect(container.textContent).toContain('Hint for a CommandPaletteItem, built on Kbd.')

		expect(container.textContent).not.toContain('{@link')
	})

	it('prefers the pipe-form label over the target name', () => {
		const { container } = renderUI(
			<DocDescription description="Same as {@link KbdProps|the kbd props}." />,
		)

		expect(container.textContent).toContain('the kbd props')

		expect(container.textContent).not.toContain('KbdProps')
	})

	it('renders an external URL link as an anchor', () => {
		renderUI(<DocDescription description="See {@link https://example.com}." />)

		const anchor = screen.getByRole('link', { name: 'https://example.com' })

		expect(anchor).toHaveAttribute('href', 'https://example.com')
	})
})
