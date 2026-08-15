import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AddressProvider, AddressSuggestion } from '../../components/address-input'
import { AddressInput, createPhotonProvider, photonProvider } from '../../components/address-input'
import { Form, useFormState } from '../../components/form'
import { bySlot, fireEvent, renderUI, screen, userEvent, waitFor, withFakeTime } from '../helpers'

const mockProvider: AddressProvider = async (query) => [
	{ id: '1', label: `${query} Main St`, description: 'Somewhere, CA' },
	{ id: '2', label: `${query} Oak Ave`, description: 'Nowhere, NY' },
]

/** Reads one field back out of the form store, for the binding assertions. */
function FormValue({ name }: { name: string }) {
	const state = useFormState()

	const held = state?.values[name] as AddressSuggestion | undefined

	return <output data-testid="bound">{held?.label ?? ''}</output>
}

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

	it('names the input from the placeholder by default', () => {
		const { container } = renderUI(<AddressInput />)

		expect(bySlot(container, 'combobox-input')).toHaveAttribute('aria-label', 'Enter an address')
	})

	it('accepts an explicit aria-label over the placeholder', () => {
		const { container } = renderUI(<AddressInput aria-label="Shipping address" placeholder="…" />)

		expect(bySlot(container, 'combobox-input')).toHaveAttribute('aria-label', 'Shipping address')
	})

	it('defaults autoComplete to "off"', () => {
		const { container } = renderUI(<AddressInput />)

		const input = bySlot(container, 'combobox-input')

		expect(input).toHaveAttribute('autoComplete', 'off')
	})

	it('calls the provider with the typed query after debounce', async () => {
		await withFakeTime(async (clock) => {
			const provider = vi.fn(mockProvider)

			const { container } = renderUI(<AddressInput provider={provider} debounceMs={0} />)

			const input = bySlot(container, 'combobox-input') as HTMLInputElement

			await clock.user.type(input, '123')

			await clock.advance(0)

			expect(provider).toHaveBeenCalled()

			const [lastQuery] = provider.mock.calls.at(-1) ?? []

			expect(lastQuery).toBe('123')
		})
	})

	it('does not call the provider below minQueryLength', async () => {
		const provider = vi.fn(mockProvider)

		const { container } = renderUI(
			<AddressInput provider={provider} debounceMs={0} minQueryLength={3} />,
		)

		const input = bySlot(container, 'combobox-input') as HTMLInputElement

		const user = userEvent.setup({ delay: null })

		await user.type(input, 'ab')

		// The minQueryLength gate returns before scheduling a debounce timer, so no async work is pending.
		expect(provider).not.toHaveBeenCalled()
	})

	it('renders suggestions returned by the provider', async () => {
		await withFakeTime(async (clock) => {
			const provider = vi.fn(mockProvider)

			const { container, getByText } = renderUI(
				<AddressInput provider={provider} debounceMs={0} minQueryLength={1} />,
			)

			const input = bySlot(container, 'combobox-input') as HTMLInputElement

			await clock.user.type(input, 'x')

			await clock.advance(0)

			// `capitalize` defaults on: string option labels render (and expose
			// their accessible name) first-word-capitalized.
			expect(getByText('X Main St')).toBeInTheDocument()

			expect(getByText('X Oak Ave')).toBeInTheDocument()
		})
	})

	it('renders every match when a provider returns colliding ids', async () => {
		// Photon does this: one OSM object is several documents in its index, so a
		// search can return the same `osm_type`/`osm_id` pair twice. Keyed by the
		// id alone, React warned and was free to drop or duplicate a row on the
		// next update.
		const colliding: AddressProvider = async () => [
			{ id: 'R192205', label: 'Clearwater', description: 'South Carolina' },
			{ id: 'R192205', label: 'Clearwater', description: 'Clearwater, South Carolina' },
		]

		const warn = vi.spyOn(console, 'error').mockImplementation(() => {})

		try {
			await withFakeTime(async (clock) => {
				const { container } = renderUI(
					<AddressInput provider={colliding} debounceMs={0} minQueryLength={1} />,
				)

				const input = bySlot(container, 'combobox-input') as HTMLInputElement

				await clock.user.type(input, 'c')

				await clock.advance(0)

				expect(screen.getAllByRole('option')).toHaveLength(2)
			})

			const keyWarnings = warn.mock.calls.filter((call) =>
				call.some((arg) => typeof arg === 'string' && arg.includes('same key')),
			)

			expect(keyWarnings).toEqual([])
		} finally {
			warn.mockRestore()
		}
	})

	it('binds the selection to a Form field by name', async () => {
		await withFakeTime(async (clock) => {
			const { container } = renderUI(
				<Form defaultValues={{ address: undefined as AddressSuggestion | undefined }}>
					<AddressInput name="address" provider={mockProvider} debounceMs={0} minQueryLength={1} />
					<FormValue name="address" />
				</Form>,
			)

			const input = bySlot(container, 'combobox-input') as HTMLInputElement

			await clock.user.type(input, 'x')

			await clock.advance(0)

			await clock.user.click(screen.getByRole('option', { name: /X Main St/ }))

			// The field holds the suggestion the provider returned; `capitalize`
			// styles the display and never the stored value.
			expect(screen.getByTestId('bound')).toHaveTextContent('x Main St')
		})
	})

	it('seeds the field value into the input display', () => {
		const { container } = renderUI(
			<Form defaultValues={{ address: { id: '1', label: '10 Main St' } }}>
				<AddressInput name="address" />
			</Form>,
		)

		expect((bySlot(container, 'combobox-input') as HTMLInputElement).value).toBe('10 Main St')
	})

	it('aborts the in-flight request when the query changes', async () => {
		await withFakeTime(async (clock) => {
			const signals: AbortSignal[] = []

			const provider: AddressProvider = (_, { signal }) => {
				signals.push(signal)

				return new Promise(() => {})
			}

			const { container } = renderUI(
				<AddressInput provider={provider} debounceMs={0} minQueryLength={1} />,
			)

			const input = bySlot(container, 'combobox-input') as HTMLInputElement

			await clock.user.type(input, 'a')

			await clock.advance(0)

			expect(signals.length).toBeGreaterThanOrEqual(1)

			await clock.user.type(input, 'b')

			expect(signals[0]?.aborted).toBe(true)
		})
	})

	it('focuses the input and opens the menu from the suffix icon', async () => {
		await withFakeTime(async (clock) => {
			const provider = vi.fn(mockProvider)

			const { container } = renderUI(
				<AddressInput provider={provider} debounceMs={0} minQueryLength={0} />,
			)

			const input = bySlot(container, 'combobox-input') as HTMLInputElement

			// The menu has not been requested yet; the provider stays idle.
			expect(provider).not.toHaveBeenCalled()

			expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

			const suffix = bySlot(container, 'suffix')

			if (!suffix) throw new Error('suffix slot not found')

			fireEvent.mouseDown(suffix)

			expect(input).toHaveFocus()

			await clock.advance(0)

			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})
	})

	it('renders the selected suggestion label as the input display value', () => {
		const selected: AddressSuggestion = {
			id: '1',
			label: '10 Main St',
			description: 'Springfield, IL',
		}

		const { container } = renderUI(<AddressInput value={selected} />)

		const input = bySlot(container, 'combobox-input') as HTMLInputElement

		expect(input.value).toBe('10 Main St')
	})

	it('stays empty on blur after clearing a controlled selection', async () => {
		function Controlled() {
			const [address, setAddress] = useState<AddressSuggestion | null>(null)

			return (
				<AddressInput
					value={address}
					onValueChange={setAddress}
					provider={mockProvider}
					debounceMs={0}
					minQueryLength={1}
				/>
			)
		}

		await withFakeTime(async (clock) => {
			const { container } = renderUI(<Controlled />)

			const input = bySlot(container, 'combobox-input') as HTMLInputElement

			await clock.user.type(input, 'x')

			await clock.advance(0)

			await clock.user.click(screen.getByRole('option', { name: /X Main St/ }))

			// `capitalize` defaults on, so the resolved display value is
			// first-word-capitalized in the input's DOM value.
			expect(input.value).toBe('X Main St')

			await clock.user.clear(input)

			expect(input.value).toBe('')

			// Blur leaves editing mode; the display must not resurrect the cleared value.
			fireEvent.blur(input)

			expect(input.value).toBe('')
		})
	})

	it('swaps the pin for a clear button while an address is selected', async () => {
		await withFakeTime(async (clock) => {
			const onValueChange = vi.fn()

			const { container } = renderUI(
				<AddressInput
					provider={mockProvider}
					debounceMs={0}
					minQueryLength={1}
					onValueChange={onValueChange}
				/>,
			)

			const input = bySlot(container, 'combobox-input') as HTMLInputElement

			expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()

			await clock.user.type(input, 'x')

			await clock.advance(0)

			await clock.user.click(screen.getByRole('option', { name: /X Main St/ }))

			const clear = screen.getByRole('button', { name: 'Clear selection' })

			// mousedown is swallowed so the trigger doesn't steal focus before the click lands.
			fireEvent.mouseDown(clear)

			fireEvent.click(clear)

			expect(onValueChange).toHaveBeenLastCalledWith(null)

			expect(input.value).toBe('')

			expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument()

			// The pin returns once the selection is cleared.
			expect(bySlot(container, 'suffix')?.querySelector('[data-slot="icon"]')).toBeInTheDocument()
		})
	})

	it('shows the clear button for a controlled initial value', () => {
		const selected: AddressSuggestion = {
			id: '1',
			label: '10 Main St',
			description: 'Springfield, IL',
		}

		renderUI(<AddressInput value={selected} />)

		expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument()
	})

	it('pulses the field while a fetch is in flight, then settles', async () => {
		await withFakeTime(async (clock) => {
			let resolve: (suggestions: AddressSuggestion[]) => void = () => {}

			const provider: AddressProvider = () =>
				new Promise<AddressSuggestion[]>((r) => {
					resolve = r
				})

			const { container } = renderUI(<AddressInput provider={provider} debounceMs={0} />)

			const input = bySlot(container, 'combobox-input') as HTMLInputElement

			const field = bySlot(container, 'address-input')

			await clock.user.type(input, '123')

			await clock.advance(0)

			expect(field).toHaveClass('animate-pulse')

			resolve([{ id: '1', label: '123 Main St' }])

			await waitFor(() => {
				expect(field).not.toHaveClass('animate-pulse')
			})
		})
	})

	it('exports a photonProvider', () => {
		expect(typeof photonProvider).toBe('function')
	})
})

describe('photonProvider', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	function makeFeature(
		properties: Record<string, unknown>,
		coordinates: [number, number] = [10, 20],
	) {
		return {
			type: 'Feature',
			geometry: { type: 'Point', coordinates },
			properties: { osm_id: 1, osm_type: 'N', ...properties },
		}
	}

	/** Answers one Photon request with these features. */
	function stubFeatures(...features: ReturnType<typeof makeFeature>[]) {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: true, json: async () => ({ features }) }) as Response),
		)
	}

	/** The named business the label, description, and identity cases all read. */
	const CLEARWATER = {
		name: 'Clearwater Restaurant',
		housenumber: '325',
		street: 'SW Bay Blvd',
		city: 'Newport',
		state: 'Oregon',
		postcode: '97365',
		country: 'United States',
	}

	it('maps features with street + housenumber into a primary + secondary label', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					({
						ok: true,
						json: async () => ({
							features: [
								makeFeature({
									housenumber: '10',
									street: 'Main St',
									city: 'Springfield',
									state: 'IL',
									country: 'USA',
									postcode: '62701',
								}),
							],
						}),
					}) as Response,
			),
		)

		const results = await photonProvider('query', { signal: new AbortController().signal })

		expect(results[0]?.label).toBe('10 Main St')

		expect(results[0]?.description).toBe('Springfield, IL, 62701, USA')

		expect(results[0]?.latitude).toBe(20)

		expect(results[0]?.longitude).toBe(10)
	})

	it('falls back to the feature name when no street is present', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					({
						ok: true,
						json: async () => ({
							features: [makeFeature({ name: 'Central Park', city: 'NY' })],
						}),
					}) as Response,
			),
		)

		const results = await photonProvider('q', { signal: new AbortController().signal })

		expect(results[0]?.label).toBe('Central Park')

		expect(results[0]?.description).toBe('NY')
	})

	it('uses the secondary as label and omits description when primary is missing', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					({
						ok: true,
						json: async () => ({
							features: [makeFeature({ city: 'NY', country: 'USA' })],
						}),
					}) as Response,
			),
		)

		const results = await photonProvider('q', { signal: new AbortController().signal })

		expect(results[0]?.label).toBe('NY, USA')

		expect(results[0]?.description).toBeUndefined()
	})

	it('leads a named business with its name and locates it beneath', async () => {
		stubFeatures(makeFeature(CLEARWATER))

		const results = await photonProvider('clearwater', { signal: new AbortController().signal })

		// The reader searched for the name, so the name is what reads back.
		expect(results[0]?.label).toBe('Clearwater Restaurant')

		expect(results[0]?.description).toBe('325 SW Bay Blvd, Newport, Oregon, 97365, United States')
	})

	it('carries the name and the parted address beside the display label', async () => {
		stubFeatures(makeFeature(CLEARWATER))

		const results = await photonProvider('clearwater', { signal: new AbortController().signal })

		expect(results[0]?.name).toBe('Clearwater Restaurant')

		expect(results[0]?.address).toEqual({
			street: '325 SW Bay Blvd',
			city: 'Newport',
			state: 'Oregon',
			postcode: '97365',
			country: 'United States',
		})
	})

	it('parts two documents of one OSM object by their type', async () => {
		stubFeatures(
			makeFeature({ osm_id: 192205, osm_type: 'R', type: 'city', name: 'Clearwater' }),
			makeFeature({ osm_id: 192205, osm_type: 'R', type: 'other', name: 'Clearwater' }),
		)

		const results = await photonProvider('clearwater', { signal: new AbortController().signal })

		// Photon indexes one object as several documents — this relation is both a
		// village and a locality — so the object alone does not identify a match.
		expect(results[0]?.id).not.toBe(results[1]?.id)
	})

	it('leaves `name` unset on a plain address, which names nothing', async () => {
		stubFeatures(makeFeature({ housenumber: '10', street: 'Main St', city: 'NY' }))

		const results = await photonProvider('q', { signal: new AbortController().signal })

		expect(results[0]?.name).toBeUndefined()

		expect(results[0]?.address?.street).toBe('10 Main St')
	})

	it('throws when the response is not ok', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false, status: 500 }) as Response),
		)

		await expect(photonProvider('q', { signal: new AbortController().signal })).rejects.toThrow(
			/Photon request failed: 500/,
		)
	})

	it('throws when the response shape does not match', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					({
						ok: true,
						json: async () => ({ features: 'not an array' }),
					}) as Response,
			),
		)

		await expect(photonProvider('q', { signal: new AbortController().signal })).rejects.toThrow(
			/did not match expected shape/,
		)
	})

	it.each([
		{ name: 'a primitive response', body: 'plain' },
		{ name: 'features containing a primitive', body: { features: ['nope'] } },
		{
			name: 'features with a null geometry',
			body: { features: [{ geometry: null, properties: {} }] },
		},
		{
			name: 'features with non-array coordinates',
			body: {
				features: [
					{
						geometry: { coordinates: 'oops' },
						properties: { osm_id: 1, osm_type: 'N' },
					},
				],
			},
		},
		{
			name: 'coordinates of the wrong length',
			body: {
				features: [
					{
						geometry: { coordinates: [1, 2, 3] },
						properties: { osm_id: 1, osm_type: 'N' },
					},
				],
			},
		},
		{
			name: 'non-numeric coordinates',
			body: {
				features: [
					{
						geometry: { coordinates: ['lat', 'lng'] },
						properties: { osm_id: 1, osm_type: 'N' },
					},
				],
			},
		},
		{
			name: 'a null properties bag',
			body: {
				features: [{ geometry: { coordinates: [1, 2] }, properties: null }],
			},
		},
		{
			name: 'a string osm_id',
			body: {
				features: [
					{
						geometry: { coordinates: [1, 2] },
						properties: { osm_id: 'abc', osm_type: 'N' },
					},
				],
			},
		},
	])('rejects responses with $name', async ({ body }) => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: true, json: async () => body }) as Response),
		)

		await expect(photonProvider('q', { signal: new AbortController().signal })).rejects.toThrow(
			/did not match expected shape/,
		)
	})
})

describe('createPhotonProvider', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	/** The one URL the stubbed fetch was called with. */
	function requestedUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
		return new URL(String(fetchMock.mock.calls[0]?.[0]))
	}

	function stubEmptyFetch() {
		const fetchMock = vi.fn(
			async () => ({ ok: true, json: async () => ({ features: [] }) }) as Response,
		)

		vi.stubGlobal('fetch', fetchMock)

		return fetchMock
	}

	it('asks the public endpoint for five matches by default', async () => {
		const fetchMock = stubEmptyFetch()

		await createPhotonProvider()('diner', { signal: new AbortController().signal })

		const url = requestedUrl(fetchMock)

		expect(url.origin + url.pathname).toBe('https://photon.komoot.io/api/')

		expect(url.searchParams.get('q')).toBe('diner')

		expect(url.searchParams.get('limit')).toBe('5')
	})

	it('carries the endpoint, limit, language, and proximity bias', async () => {
		const fetchMock = stubEmptyFetch()

		const provider = createPhotonProvider({
			endpoint: 'https://geocode.example/api/',
			limit: 8,
			lang: 'de',
			bias: { latitude: 44.64, longitude: -124.05 },
		})

		await provider('diner', { signal: new AbortController().signal })

		const url = requestedUrl(fetchMock)

		expect(url.origin + url.pathname).toBe('https://geocode.example/api/')

		expect(url.searchParams.get('limit')).toBe('8')

		expect(url.searchParams.get('lang')).toBe('de')

		expect(url.searchParams.get('lat')).toBe('44.64')

		expect(url.searchParams.get('lon')).toBe('-124.05')
	})

	it('repeats each layer and tag as its own term, which is how Photon reads them', async () => {
		const fetchMock = stubEmptyFetch()

		const provider = createPhotonProvider({
			layers: ['house', 'street'],
			osmTag: ['amenity:restaurant', '!amenity:fast_food'],
		})

		await provider('diner', { signal: new AbortController().signal })

		const url = requestedUrl(fetchMock)

		expect(url.searchParams.getAll('layer')).toEqual(['house', 'street'])

		expect(url.searchParams.getAll('osm_tag')).toEqual(['amenity:restaurant', '!amenity:fast_food'])
	})

	it('omits every option it was not given', async () => {
		const fetchMock = stubEmptyFetch()

		await createPhotonProvider()('diner', { signal: new AbortController().signal })

		const url = requestedUrl(fetchMock)

		expect(url.searchParams.has('lang')).toBe(false)

		expect(url.searchParams.has('lat')).toBe(false)

		expect(url.searchParams.getAll('layer')).toEqual([])
	})
})
