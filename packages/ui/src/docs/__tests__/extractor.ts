import { test } from 'vitest'
import { uiRoot } from '../../__tests__/helpers/walk-source.ts'
import { createApiExtractor } from '../plugin/api.ts'

/**
 * The `it` of Vitest, with an `extractor` fixture: the API extractor of the
 * docs plugin (`createApiExtractor`) for the `ui` package.
 *
 * The first `extract` of an extractor starts a TypeScript API server and opens
 * `tsconfig.api.json`, which is slow. The fixture is worker-scoped, and the
 * `pure` project runs with `isolate: false`, so the files of a worker share one
 * server. The fixture closes the extractor when the worker ends.
 */
export const it = test
	// The root of the `ui` package. Vitest reads the fixtures of a fixture from
	// an object pattern, so the extractor takes the root as a fixture.
	.extend('root', { scope: 'worker' }, uiRoot)
	.extend('extractor', { scope: 'worker' }, ({ root }, { onCleanup }) => {
		const extractor = createApiExtractor(root)

		onCleanup(() => extractor.close())

		return extractor
	})
