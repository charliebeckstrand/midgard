import { describe, expect, it } from 'vitest'
import { DocDescription } from '../../../../docs/components/api-reference/doc-description'
import { bySlot, renderUI, screen } from '../../../helpers'

describe('DocDescription', () => {
	it('passes link-free descriptions straight through Markdown', () => {
		const { container } = renderUI(<DocDescription description="Plain `code` prose." />)

		expect(bySlot(container, 'markdown')).toBeInTheDocument()

		expect(bySlot(container, 'doc-description')).not.toBeInTheDocument()
	})

	it('renders a resolved `{@link}` as a badge carrying the target name', () => {
		const { container } = renderUI(
			<DocDescription
				description="Hint for a {@link CommandPaletteItem}, built on Kbd."
				links={{ CommandPaletteItem: { signature: 'function CommandPaletteItem(): Element' } }}
			/>,
		)

		expect(bySlot(container, 'doc-description')).toBeInTheDocument()

		// The badge is the interactive tooltip trigger when a card is available;
		// `data-has-info` marks that the hover card carries a signature or summary.
		const badge = screen.getByText('CommandPaletteItem')

		expect(badge).toHaveAttribute('data-has-info', 'true')

		expect(container.textContent).toContain('built on Kbd.')
	})

	it('prefers the pipe-form label over the target name', () => {
		renderUI(
			<DocDescription
				description="Same as {@link KbdProps|the kbd props}."
				links={{ KbdProps: { signature: 'type KbdProps' } }}
			/>,
		)

		expect(screen.getByText('the kbd props')).toBeInTheDocument()
	})

	it('drops the hover card when `card` is false, keeping the reference as a plain badge', () => {
		const { container } = renderUI(
			<DocDescription
				description="See {@link KbdProps}."
				links={{ KbdProps: { signature: 'type KbdProps' } }}
				card={false}
			/>,
		)

		expect(screen.queryByRole('button')).not.toBeInTheDocument()

		const badge = bySlot(container, 'badge')

		expect(badge?.textContent).toBe('KbdProps')

		expect(badge).toHaveAttribute('title', 'type KbdProps')
	})

	it('renders an external URL link as an anchor even with no resolved links', () => {
		renderUI(<DocDescription description="See {@link https://example.com}." />)

		const anchor = screen.getByRole('link', { name: 'https://example.com' })

		expect(anchor).toHaveAttribute('href', 'https://example.com')
	})
})
