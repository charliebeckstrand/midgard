import { describe, expect, it, vi } from 'vitest'
import type { AddressProvider } from '../../components/address-input'
import { AddressInput, photonProvider } from '../../components/address-input'
import { bySlot, renderUI, userEvent, waitFor } from '../helpers'

const mockProvider: AddressProvider = async (query) => [
	{ id: '1', label: `${query} Main St`, description: 'Somewhere, CA' },
	{ id: '2', label: `${query} Oak Ave`, description: 'Nowhere, NY' },
]

describe('AddressInput', () => {
	it('renders a combobox input', () => {
		const { container } = renderUI(<AddressInput />)

		const input = bySlot(container, 'combobox-input')

		expect(input).toBeInTheDocument()

		expect(input).toHaveAttribute('role', 'combobox')
	})

	it('uses the default placeholder', () => {
		const { container } = renderUI(<AddressInput />)

		const input = bySlot(container, 'combobox-input')

		expect(input).toHaveAttribute('placeholder', 'Enter an address')
	})

	it('accepts a custom placeholder', () => {
		const { container } = renderUI(<AddressInput placeholder="Where to?" />)

		const input = bySlot(container, 'combobox-input')

		expect(input).toHaveAttribute('placeholder', 'Where to?')
	})

	it('defaults autoComplete to "off"', () => {
		const { container } = renderUI(<AddressInput />)

		const input = bySlot(container, 'combobox-input')

		expect(input).toHaveAttribute('autoComplete', 'off')
	})

	it('calls the provider with the typed query after debounce', async () => {
		const provider = vi.fn(mockProvider)

		const { container } = renderUI(<AddressInput provider={provider} debounceMs={0} />)

		const input = bySlot(container, 'combobox-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, '123')

		await waitFor(() => {
			expect(provider).toHaveBeenCalled()
		})

		const [lastQuery] = provider.mock.calls.at(-1) ?? []

		expect(lastQuery).toBe('123')
	})

	it('does not call the provider below minQueryLength', async () => {
		const provider = vi.fn(mockProvider)

		const { container } = renderUI(
			<AddressInput provider={provider} debounceMs={0} minQueryLength={3} />,
		)

		const input = bySlot(container, 'combobox-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'ab')

		await new Promise((resolve) => setTimeout(resolve, 20))

		expect(provider).not.toHaveBeenCalled()
	})

	it('renders suggestions returned by the provider', async () => {
		const provider = vi.fn(mockProvider)

		const { container, findByText } = renderUI(
			<AddressInput provider={provider} debounceMs={0} minQueryLength={1} />,
		)

		const input = bySlot(container, 'combobox-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'x')

		expect(await findByText('x Main St')).toBeInTheDocument()

		expect(await findByText('x Oak Ave')).toBeInTheDocument()
	})

	it('aborts the in-flight request when the query changes', async () => {
		const signals: AbortSignal[] = []

		const provider: AddressProvider = (_, { signal }) => {
			signals.push(signal)
			return new Promise(() => {})
		}

		const { container } = renderUI(
			<AddressInput provider={provider} debounceMs={0} minQueryLength={1} />,
		)

		const input = bySlot(container, 'combobox-input') as HTMLInputElement

		const user = userEvent.setup()

		await user.type(input, 'a')

		await waitFor(() => {
			expect(signals.length).toBeGreaterThanOrEqual(1)
		})

		await user.type(input, 'b')

		await waitFor(() => {
			expect(signals[0]?.aborted).toBe(true)
		})
	})

	it('exports a photonProvider', () => {
		expect(typeof photonProvider).toBe('function')
	})
})
