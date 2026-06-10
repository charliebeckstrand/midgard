type Geometry = {
	clientHeight?: number
	clientWidth?: number
	scrollHeight?: number
	scrollWidth?: number
	scrollTop?: number
	scrollLeft?: number
}

/**
 * Overrides an element's layout geometry — jsdom reports a zero-size viewport,
 * so scroll/thumb math needs explicit dimensions.
 */
export function mockGeometry<T extends Element>(el: T, geometry: Geometry): T {
	for (const [key, value] of Object.entries(geometry)) {
		Object.defineProperty(el, key, {
			value,
			configurable: true,
			writable: true,
		})
	}

	return el
}
