import { describe, expect, it } from 'vitest'
import type { AddressSuggestion } from '../../components/address-input'
import { AddressInput } from '../../components/address-input'
import { ControlLockContext } from '../../components/control/context'
import { bySlot, renderUI, screen } from '../helpers'

// K3-C03: the lock makes the Combobox read-only, which hides its clear button.
// The pin must keep the slot, or the slot falls back to the Combobox chevron.

const selected: AddressSuggestion = { id: '1', label: '10 Main St', description: 'Springfield, IL' }

describe('AddressInput in a locked scope', () => {
	it('keeps the pin, not the Combobox chevron, with a selection', () => {
		const { container } = renderUI(
			<ControlLockContext value>
				<AddressInput aria-label="Address" value={selected} />
			</ControlLockContext>,
		)

		expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeNull()

		expect(bySlot(container, 'suffix')?.querySelector('svg.lucide-map-pin')).toBeInTheDocument()
	})
})
