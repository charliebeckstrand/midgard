// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { importAssetUrls } from '../plugin/asset-urls.ts'

describe('importAssetUrls', () => {
	it('reads an asset URL from an import with `?url`', () => {
		const code = `'use client'\nconst path = new URL('../fonts/latin.js', import.meta.url).pathname\n`

		expect(importAssetUrls(code)).toBe(
			`'use client'\nconst path = new URL(__docsAssetUrl0, import.meta.url).pathname\n\nimport __docsAssetUrl0 from "../fonts/latin.js?url"\n`,
		)
	})

	it('leaves the URL of a worker and a module with no asset URL', () => {
		expect(
			importAssetUrls(`new Worker(new URL("./worker.ts", import.meta.url), { type: 'module' })`),
		).toBeUndefined()

		expect(importAssetUrls('const here = import.meta.url')).toBeUndefined()
	})
})
