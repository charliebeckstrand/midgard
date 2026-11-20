import { test } from 'vitest'
import { uiRoot } from '../../__tests__/helpers/walk-source.ts'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { type ApiExtractor, type BarrelApi, createApiExtractor } from '../plugin/api.ts'

/** Freezes `value` and each object in it, so that a write to it throws. */
function deepFreeze<T>(value: T): T {
	if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
		Object.freeze(value)

		for (const child of Object.values(value)) deepFreeze(child)
	}

	return value
}

/**
 * The `it` of Vitest, with an `extractor` fixture: the API extractor of the
 * docs plugin (`createApiExtractor`) for the `ui` package.
 *
 * The first `extract` of an extractor starts a TypeScript API server and opens
 * `tsconfig.api.json`, which is slow. The fixture is worker-scoped, and the
 * `pure` project runs with `isolate: false`, so the files of a worker share one
 * server. The fixture closes the extractor when the worker ends.
 *
 * The fixture also keeps the result of each barrel, so the files of a worker
 * extract a barrel one time. Each file gets the same object, so the fixture
 * freezes it, and a write to it throws. A `refresh` clears the results.
 */
export const it = test
	// The root of the `ui` package. Vitest reads the fixtures of a fixture from
	// an object pattern, so the extractor takes the root as a fixture.
	.extend('root', { scope: 'worker' }, uiRoot)
	.extend('extractor', { scope: 'worker' }, ({ root }, { onCleanup }): ApiExtractor => {
		const extractor = createApiExtractor(root)

		onCleanup(() => extractor.close())

		const results = new Map<string, Promise<BarrelApi>>()

		return {
			extract: (barrel) =>
				getOrCompute(results, barrel, () => extractor.extract(barrel).then(deepFreeze)),
			refresh(change) {
				results.clear()

				extractor.refresh(change)
			},
			close: () => extractor.close(),
		}
	})
