import { render } from '@testing-library/react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type MapContextValue, MapProvider } from '../../components/map/context'
import { HIT_LAYER_WIDTH } from '../../components/map/map-route-constants'
import type { SegmentStatus } from '../../components/map/map-route-utilities'
import type { RouteData } from '../../components/map/types'
import { useMapRouteLayers } from '../../components/map/use-map-route-layers'

type Handler = (...args: unknown[]) => void

// Only the MapLibreMap members `useMapRouteLayers` actually calls. Typing the
// fake to this subset means we can cast it to MapLibreMap with a single `as` —
// the bidirectional-overlap rule holds because MapLibreMap is assignable to
// the `Pick`. The hook never reaches for anything outside this surface, so the
// runtime stays sound.
type RouteLayerMapApi = Pick<
	MapLibreMap,
	| 'on'
	| 'off'
	| 'addSource'
	| 'addLayer'
	| 'getSource'
	| 'setPaintProperty'
	| 'getLayer'
	| 'removeLayer'
	| 'removeSource'
	| 'getCanvas'
>

type FakeMap = {
	api: RouteLayerMapApi
	spies: {
		on: ReturnType<typeof vi.fn>
		off: ReturnType<typeof vi.fn>
		addSource: ReturnType<typeof vi.fn>
		addLayer: ReturnType<typeof vi.fn>
		getSource: ReturnType<typeof vi.fn>
		setPaintProperty: ReturnType<typeof vi.fn>
		getLayer: ReturnType<typeof vi.fn>
		removeLayer: ReturnType<typeof vi.fn>
		removeSource: ReturnType<typeof vi.fn>
		getCanvas: ReturnType<typeof vi.fn>
	}
	emit: (event: string, layer: string, payload?: unknown) => void
	canvasStyle: { cursor: string }
	sources: Map<string, { setData: ReturnType<typeof vi.fn> }>
	layers: Map<string, true>
	handlers: Map<string, Set<Handler>>
}

function makeFakeMap(): FakeMap {
	const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()

	const layers = new Map<string, true>()

	const handlers = new Map<string, Set<Handler>>()

	const canvasStyle = { cursor: '' }

	// `vi.fn()` without an inferred impl produces `Mock<Procedure>` — the
	// universal-donor function shape `(...args: any[]) => any`. That assigns
	// cleanly to MapLibre's overloaded method types via the `api as MapLibreMap`
	// cast below, where contextually typing impls (`vi.fn(impl)`) would narrow
	// the mock's return to `void` and conflict with MapLibre's chainable `this`.
	const onSpy = vi.fn()

	onSpy.mockImplementation((event: string, layer: string, handler: Handler) => {
		const key = `${event}:${layer}`

		if (!handlers.has(key)) handlers.set(key, new Set())

		handlers.get(key)?.add(handler)
	})

	const offSpy = vi.fn()

	offSpy.mockImplementation((event: string, layer: string, handler: Handler) => {
		handlers.get(`${event}:${layer}`)?.delete(handler)
	})

	const addSourceSpy = vi.fn()

	addSourceSpy.mockImplementation((id: string) => {
		sources.set(id, { setData: vi.fn() })
	})

	const addLayerSpy = vi.fn()

	addLayerSpy.mockImplementation((spec: { id: string }) => {
		layers.set(spec.id, true)
	})

	const getSourceSpy = vi.fn()

	getSourceSpy.mockImplementation((id: string) => sources.get(id))

	const setPaintPropertySpy = vi.fn()

	const getLayerSpy = vi.fn()

	getLayerSpy.mockImplementation((id: string) => (layers.has(id) ? true : undefined))

	const removeLayerSpy = vi.fn()

	removeLayerSpy.mockImplementation((id: string) => {
		layers.delete(id)
	})

	const removeSourceSpy = vi.fn()

	removeSourceSpy.mockImplementation((id: string) => {
		sources.delete(id)
	})

	const getCanvasSpy = vi.fn()

	getCanvasSpy.mockImplementation(() => ({ style: canvasStyle }))

	const api: RouteLayerMapApi = {
		on: onSpy,
		off: offSpy,
		addSource: addSourceSpy,
		addLayer: addLayerSpy,
		getSource: getSourceSpy,
		setPaintProperty: setPaintPropertySpy,
		getLayer: getLayerSpy,
		removeLayer: removeLayerSpy,
		removeSource: removeSourceSpy,
		getCanvas: getCanvasSpy,
	}

	return {
		api,
		spies: {
			on: onSpy,
			off: offSpy,
			addSource: addSourceSpy,
			addLayer: addLayerSpy,
			getSource: getSourceSpy,
			setPaintProperty: setPaintPropertySpy,
			getLayer: getLayerSpy,
			removeLayer: removeLayerSpy,
			removeSource: removeSourceSpy,
			getCanvas: getCanvasSpy,
		},
		emit: (event: string, layer: string, payload?: unknown) => {
			for (const h of handlers.get(`${event}:${layer}`) ?? []) h(payload)
		},
		canvasStyle,
		sources,
		layers,
		handlers,
	}
}

type HarnessProps = {
	mapValue: MapContextValue
	sourceId?: string
	layerId?: string
	hitLayerId?: string
	data: RouteData
	resolvedColors: Record<SegmentStatus, string>
	width: number
	disableInteraction?: boolean
	onSelect?: (route: RouteData) => boolean | undefined
}

function Harness({
	mapValue,
	sourceId = 'route-source',
	layerId = 'route-layer',
	hitLayerId = 'route-hit',
	data,
	resolvedColors,
	width,
	disableInteraction = false,
	onSelect,
}: HarnessProps) {
	const latestRef = useRef({ data, resolvedColors, width, disableInteraction, onSelect })

	latestRef.current = { data, resolvedColors, width, disableInteraction, onSelect }

	const handleSelectRef = useRef(() => {
		latestRef.current.onSelect?.(latestRef.current.data)
	})

	return (
		<MapProvider value={mapValue}>
			<RouteLayersConsumer
				sourceId={sourceId}
				layerId={layerId}
				hitLayerId={hitLayerId}
				data={data}
				resolvedColors={resolvedColors}
				width={width}
				latestRef={latestRef}
				handleSelectRef={handleSelectRef}
			/>
		</MapProvider>
	)
}

type ConsumerProps = Parameters<typeof useMapRouteLayers>[0]

function RouteLayersConsumer(props: ConsumerProps) {
	useMapRouteLayers(props)

	return null
}

const colors: Record<SegmentStatus, string> = {
	pending: '#aaa',
	active: '#00f',
	done: '#0f0',
}

const route: RouteData = {
	id: 'r1',
	stops: [
		{ id: 's1', name: 'A', position: [0, 0], status: 'done' },
		{ id: 's2', name: 'B', position: [1, 1], status: 'active' },
	],
}

type MapHandle = { map: FakeMap | null }

function setup() {
	const fake = makeFakeMap()

	const handle: MapHandle = { map: fake }

	const value: MapContextValue = {
		getMap: () => (handle.map ? (handle.map.api as MapLibreMap) : null),
		onReady: (cb) => {
			if (handle.map) cb(handle.map.api as MapLibreMap)

			return () => {}
		},
	}

	return { fake, handle, value }
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('useMapRouteLayers', () => {
	it('registers a source and two layers on the map when ready', () => {
		const { fake, value } = setup()

		render(<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />)

		expect(fake.spies.addSource).toHaveBeenCalledWith(
			'route-source',
			expect.objectContaining({
				type: 'geojson',
			}),
		)

		expect(fake.spies.addLayer).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'route-layer', type: 'line' }),
		)

		expect(fake.spies.addLayer).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'route-hit',
				type: 'line',
				paint: expect.objectContaining({ 'line-width': HIT_LAYER_WIDTH }),
			}),
		)
	})

	it('wires click, mouseenter, and mouseleave handlers to the hit layer', () => {
		const { fake, value } = setup()

		render(<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />)

		expect(fake.spies.on).toHaveBeenCalledWith('click', 'route-hit', expect.any(Function))

		expect(fake.spies.on).toHaveBeenCalledWith('mouseenter', 'route-hit', expect.any(Function))

		expect(fake.spies.on).toHaveBeenCalledWith('mouseleave', 'route-hit', expect.any(Function))
	})

	it('invokes onSelect and stops propagation when the hit layer is clicked', () => {
		const { fake, value } = setup()

		const onSelect = vi.fn(() => true)

		render(
			<Harness
				mapValue={value}
				data={route}
				resolvedColors={colors}
				width={4}
				onSelect={onSelect}
			/>,
		)

		const stopPropagation = vi.fn()

		fake.emit('click', 'route-hit', { originalEvent: { stopPropagation } })

		expect(stopPropagation).toHaveBeenCalled()

		expect(onSelect).toHaveBeenCalledWith(route)
	})

	it('ignores hit-layer clicks when interaction is disabled', () => {
		const { fake, value } = setup()

		const onSelect = vi.fn()

		render(
			<Harness
				mapValue={value}
				data={route}
				resolvedColors={colors}
				width={4}
				disableInteraction
				onSelect={onSelect}
			/>,
		)

		const stopPropagation = vi.fn()

		fake.emit('click', 'route-hit', { originalEvent: { stopPropagation } })

		expect(stopPropagation).not.toHaveBeenCalled()

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('switches the cursor to pointer on mouseenter', () => {
		const { fake, value } = setup()

		render(<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />)

		fake.emit('mouseenter', 'route-hit')

		expect(fake.canvasStyle.cursor).toBe('pointer')
	})

	it('does not change the cursor on mouseenter when interaction is disabled', () => {
		const { fake, value } = setup()

		render(
			<Harness
				mapValue={value}
				data={route}
				resolvedColors={colors}
				width={4}
				disableInteraction
			/>,
		)

		fake.emit('mouseenter', 'route-hit')

		expect(fake.canvasStyle.cursor).toBe('')
	})

	it('resets the cursor on mouseleave', () => {
		const { fake, value } = setup()

		render(<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />)

		fake.canvasStyle.cursor = 'pointer'

		fake.emit('mouseleave', 'route-hit')

		expect(fake.canvasStyle.cursor).toBe('')
	})

	it('updates the source with new geometry when data changes', () => {
		const { fake, value } = setup()

		const { rerender } = render(
			<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />,
		)

		const source = fake.sources.get('route-source')

		expect(source?.setData).toHaveBeenCalledTimes(1)

		const nextRoute: RouteData = {
			id: 'r1',
			stops: [...route.stops, { id: 's3', name: 'C', position: [2, 2], status: 'pending' }],
		}

		rerender(<Harness mapValue={value} data={nextRoute} resolvedColors={colors} width={4} />)

		expect(source?.setData).toHaveBeenCalledTimes(2)
	})

	it('repaints color and width when resolvedColors or width change', () => {
		const { fake, value } = setup()

		const { rerender } = render(
			<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />,
		)

		fake.spies.setPaintProperty.mockClear()

		rerender(
			<Harness
				mapValue={value}
				data={route}
				resolvedColors={{ ...colors, active: '#ff0' }}
				width={8}
			/>,
		)

		expect(fake.spies.setPaintProperty).toHaveBeenCalledWith(
			'route-layer',
			'line-color',
			expect.any(Array),
		)

		expect(fake.spies.setPaintProperty).toHaveBeenCalledWith('route-layer', 'line-width', 8)
	})

	it('skips the paint-sync effect when the layer is not yet registered', () => {
		const { fake, value } = setup()

		fake.spies.getLayer.mockReturnValue(undefined)

		render(<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />)

		expect(fake.spies.setPaintProperty).not.toHaveBeenCalled()
	})

	it('removes handlers, layers, and source on unmount and resets the cursor', () => {
		const { fake, value } = setup()

		fake.canvasStyle.cursor = 'pointer'

		const { unmount } = render(
			<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />,
		)

		unmount()

		expect(fake.spies.off).toHaveBeenCalledWith('click', 'route-hit', expect.any(Function))

		expect(fake.spies.off).toHaveBeenCalledWith('mouseenter', 'route-hit', expect.any(Function))

		expect(fake.spies.off).toHaveBeenCalledWith('mouseleave', 'route-hit', expect.any(Function))

		expect(fake.spies.removeLayer).toHaveBeenCalledWith('route-hit')

		expect(fake.spies.removeLayer).toHaveBeenCalledWith('route-layer')

		expect(fake.spies.removeSource).toHaveBeenCalledWith('route-source')

		expect(fake.canvasStyle.cursor).toBe('')
	})

	it('swallows errors thrown during cleanup when the map is torn down', () => {
		const { fake, value } = setup()

		fake.spies.off.mockImplementation(() => {
			throw new Error('map disposed')
		})

		const { unmount } = render(
			<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />,
		)

		expect(() => unmount()).not.toThrow()
	})

	it('skips cleanup operations when getMap returns null after unmount', () => {
		const { fake, handle, value } = setup()

		const { unmount } = render(
			<Harness mapValue={value} data={route} resolvedColors={colors} width={4} />,
		)

		// Simulate the map being torn down before our cleanup runs.
		handle.map = null

		unmount()

		// removeLayer/removeSource only run when getMap returns the live map;
		// once it returns null, the cleanup bails before touching them.
		expect(fake.spies.removeLayer).not.toHaveBeenCalled()

		expect(fake.spies.removeSource).not.toHaveBeenCalled()
	})
})
