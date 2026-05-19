/**
 * `maplibre-gl` mock applied globally via `setup/module-mocks.ts`.
 *
 * jsdom has no WebGL, so swap the MapLibre runtime for a minimal fake that
 * records calls and fires 'load' on the next microtask.
 */

class FakeMap {
	private handlers = new Map<string, Set<(...args: unknown[]) => void>>()
	private sources = new Map<string, unknown>()
	private layers = new Map<string, unknown>()

	container: HTMLElement

	constructor(opts: { container: HTMLElement }) {
		this.container = opts.container

		queueMicrotask(() => this.emit('load'))
	}

	on(
		event: string,
		layerOrHandler: string | ((...a: unknown[]) => void),
		handler?: (...a: unknown[]) => void,
	) {
		const key = typeof layerOrHandler === 'string' ? `${event}:${layerOrHandler}` : event

		const fn = (typeof layerOrHandler === 'function' ? layerOrHandler : handler) as (
			...a: unknown[]
		) => void

		if (!this.handlers.has(key)) this.handlers.set(key, new Set())

		this.handlers.get(key)?.add(fn)
	}

	off() {}

	emit(event: string, payload?: unknown) {
		for (const fn of this.handlers.get(event) ?? []) fn(payload)
	}

	addSource(id: string, data: unknown) {
		this.sources.set(id, {
			data,
			setData: (next: unknown) => this.sources.set(id, { data: next }),
		})
	}

	getSource(id: string) {
		return this.sources.get(id) as { setData: (d: unknown) => void } | undefined
	}

	removeSource(id: string) {
		this.sources.delete(id)
	}

	addLayer(spec: { id: string }) {
		this.layers.set(spec.id, spec)
	}

	getLayer(id: string) {
		return this.layers.get(id)
	}

	removeLayer(id: string) {
		this.layers.delete(id)
	}

	setPaintProperty() {}

	jumpTo() {}

	setStyle() {}

	addControl() {
		return this
	}

	removeControl() {
		return this
	}

	getCanvas() {
		return { style: {} as CSSStyleDeclaration }
	}

	remove() {
		this.handlers.clear()
		this.sources.clear()
		this.layers.clear()
	}
}

class FakeMarker {
	element: HTMLElement

	constructor(opts: { element: HTMLElement }) {
		this.element = opts.element
	}

	setLngLat() {
		return this
	}

	addTo(map: { container: HTMLElement }) {
		map.container.appendChild(this.element)

		return this
	}

	remove() {
		this.element.remove()
	}
}

class FakeAttributionControl {}

export default {
	Map: FakeMap,
	Marker: FakeMarker,
	AttributionControl: FakeAttributionControl,
	default: { Map: FakeMap, Marker: FakeMarker, AttributionControl: FakeAttributionControl },
}
