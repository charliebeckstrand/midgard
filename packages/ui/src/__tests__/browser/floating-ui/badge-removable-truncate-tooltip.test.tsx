import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { TagInput } from '../../../components/tag-input'
import { ChatPrompt } from '../../../modules/chat'
import { noop, renderUI, screen } from '../../helpers'
import { tooltipAfterHover } from '../helpers/tooltip'

/**
 * The truncation reveal of a removable chip (WCAG 1.4.10, 1.4.4). A narrow
 * TagInput cuts each tag to the width of its chip, so the chip shows its full
 * label in a tooltip on a hover of the chip and on a keyboard focus of its
 * remove button, the one Tab stop of the chip. The jsdom suite sees no overflow
 * and mocks `@floating-ui/react`, so the reveal shows only here.
 */
describe('removable chip truncation tooltip (real browser)', () => {
	const LONG = 'Research the quarterly carrier contracts'

	const SHORT = 'Ops'

	function Tags() {
		return (
			<>
				<button type="button">away</button>

				<div style={{ width: 240 }}>
					<TagInput aria-label="Tags" defaultValue={[SHORT, LONG]} />
				</div>
			</>
		)
	}

	/** The chip of `label`, found from its remove button. */
	function chip(label: string) {
		const remove = screen.getByRole('button', { name: `Remove ${label}` })

		const badge = remove.closest<HTMLElement>('[data-slot="badge"]')

		if (!badge) throw new Error(`no chip for ${label}`)

		return { remove, badge }
	}

	it('shows the full label in a tooltip on a hover of a cut chip', async () => {
		renderUI(<Tags />)

		await userEvent.hover(chip(LONG).badge)

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)

		// The tooltip echoes the label, so the chip takes no description from it.
		expect(chip(LONG).badge).not.toHaveAttribute('aria-describedby')
	})

	it('shows the full label when the keyboard focuses the remove button of a cut chip', async () => {
		renderUI(<Tags />)

		// The pointer rests away from the chips, so a hover cannot open the tooltip.
		await userEvent.hover(screen.getByRole('button', { name: 'away' }))

		// A real Shift+Tab from the field to the remove button of the last chip, not
		// `focus()`. The tooltip opens on a focus that matches `:focus-visible`, and
		// an earlier test can leave a pointer input.
		screen.getByRole('textbox', { name: 'Tags' }).focus()

		await userEvent.tab({ shift: true })

		expect(document.activeElement).toBe(chip(LONG).remove)

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(LONG)

		// The remove button holds the label in its name, so the reveal adds no description.
		expect(chip(LONG).remove).not.toHaveAttribute('aria-describedby')
	})

	it('opens no tooltip on a chip whose label fits', async () => {
		renderUI(<Tags />)

		await userEvent.hover(chip(SHORT).badge)

		expect(await tooltipAfterHover()).toBeNull()
	})

	it('shows the full name of a cut attachment chip in a chat prompt', async () => {
		const name = `${'long-attachment-name-'.repeat(6)}.pdf`

		renderUI(
			<div style={{ width: 240 }}>
				<ChatPrompt
					value=""
					onValueChange={noop}
					onSubmit={noop}
					attachments={[new File(['a'], name, { type: 'application/pdf' })]}
					onRemoveAttachment={noop}
				/>
			</div>,
		)

		await userEvent.hover(chip(name).badge)

		const tip = await screen.findByRole('tooltip')

		expect(tip).toHaveTextContent(name)
	})
})
