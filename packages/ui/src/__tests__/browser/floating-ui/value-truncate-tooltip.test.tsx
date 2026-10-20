import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { DatePicker } from '../../../components/date-picker'
import { FileUploadDrop } from '../../../components/file-upload'
import { bySlot, getSlot, present, renderUI, screen, waitFor } from '../../helpers'
import { pause } from '../helpers/wall-clock'

/** The value span of the date picker, which the tooltip trigger stamps. */
const VALUE = '[data-slot="datepicker-button"] [data-slot="tooltip-trigger"]'

/** A placeholder that no narrow control can show whole. */
const LONG_PLACEHOLDER = 'choose one of the many stages of the order'

/**
 * Waits past the 250 ms hover delay of the tooltip, with no pointer leave to
 * cancel it. Returns the open tooltip, or `null`.
 */
async function tooltipAfterHover(): Promise<HTMLElement | null> {
	await pause(400)

	return screen.queryByRole('tooltip')
}

/**
 * The truncation tooltips of the value controls that `select-truncate-tooltip`
 * does not cover, against the real floating engine and the real layout. Each
 * control measures its value through `useTruncation`, which arms on the first
 * hover. A placeholder can clip too, but it is not a value, so it opens no
 * tooltip.
 */
describe('DatePicker value truncation (real browser)', () => {
	it('shows the whole date on hover while the trigger clips it', async () => {
		const { container } = renderUI(
			<div style={{ width: 90 }}>
				<DatePicker aria-label="Due date" defaultValue={new Date(2026, 9, 20)} />
			</div>,
		)

		const value = present(container.querySelector(VALUE), VALUE)

		await userEvent.hover(value)

		await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('2026'))
	})

	it('shows no tooltip for a clipped placeholder', async () => {
		const { container } = renderUI(
			<div style={{ width: 90 }}>
				<DatePicker aria-label="Due date" placeholder={LONG_PLACEHOLDER} />
			</div>,
		)

		const value = present(container.querySelector(VALUE), VALUE)

		await userEvent.hover(value)

		expect(await tooltipAfterHover()).toBeNull()
	})
})

describe('Combobox empty value (real browser)', () => {
	it('shows no tooltip for a clipped placeholder', async () => {
		const { container } = renderUI(
			<div style={{ width: 120 }}>
				<Combobox aria-label="Stage" placeholder={LONG_PLACEHOLDER} truncateTooltip>
					<ComboboxOption value="shipped">
						<ComboboxLabel>shipped</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
			</div>,
		)

		await userEvent.hover(present(bySlot(container, 'combobox-input'), 'combobox-input'))

		expect(await tooltipAfterHover()).toBeNull()
	})
})

describe('FileUploadDrop selection truncation (real browser)', () => {
	/** Selects one file the way the native picker does, since a test cannot drive the picker. */
	function pick(container: HTMLElement, name: string) {
		const input = present<HTMLInputElement>(
			container.querySelector('input[type="file"]'),
			'input[type="file"]',
		)

		const transfer = new DataTransfer()

		transfer.items.add(new File(['x'], name))

		input.files = transfer.files

		input.dispatchEvent(new Event('change', { bubbles: true }))
	}

	const LONG_NAME = 'quarterly-freight-reconciliation-for-every-regional-carrier.pdf'

	it('shows the whole name on a hover while the label clips it', async () => {
		const { container } = renderUI(
			<div style={{ width: 200 }}>
				<FileUploadDrop />
			</div>,
		)

		pick(container, LONG_NAME)

		await screen.findByRole('button', { name: 'Choose a different file' })

		// The label ignores the pointer, so a hover off the Reset button lands on
		// the overlay under the label.
		await userEvent.hover(getSlot(container, 'file-upload'), { position: { x: 8, y: 8 } })

		await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent(LONG_NAME))
	})

	it('shows no tooltip for a name that fits', async () => {
		const { container } = renderUI(
			<div style={{ width: 400 }}>
				<FileUploadDrop />
			</div>,
		)

		pick(container, 'cv.pdf')

		await screen.findByRole('button', { name: 'Choose a different file' })

		await userEvent.hover(getSlot(container, 'file-upload'), { position: { x: 8, y: 8 } })

		expect(await tooltipAfterHover()).toBeNull()
	})
})
