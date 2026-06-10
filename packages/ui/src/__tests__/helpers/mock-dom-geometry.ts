type GeometryKey =
	| 'clientHeight'
	| 'clientWidth'
	| 'offsetHeight'
	| 'offsetWidth'
	| 'scrollHeight'
	| 'scrollLeft'
	| 'scrollTop'
	| 'scrollWidth'

/**
 * Define layout-derived element properties that jsdom always reports as 0.
 * Properties stay writable for re-mocking between assertions.
 */
export function mockDomGeometry<T extends Element>(
	el: T,
	geometry: Partial<Record<GeometryKey, number>>,
): T {
	for (const [key, value] of Object.entries(geometry)) {
		Object.defineProperty(el, key, { value, configurable: true, writable: true })
	}

	return el
}
