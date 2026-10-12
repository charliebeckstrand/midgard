// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { importAssetUrls, serverStylesheetUrl } from '../plugin/asset-urls.ts'

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

describe('serverStylesheetUrl', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'docs-stylesheet-'))

	const clientDir = path.join(root, 'dist', 'client')

	mkdirSync(path.join(clientDir, '.vite'), { recursive: true })

	writeFileSync(
		path.join(clientDir, '.vite', 'manifest.json'),
		JSON.stringify({ 'app/app.css': { file: 'assets/app-abc.css' } }),
	)

	/** The module that the plugin gives the server build for `stylesheet` with `?url`. */
	function load(stylesheet: string): unknown {
		const plugin = serverStylesheetUrl(stylesheet, clientDir)

		const hook = plugin.load as { handler: (this: unknown, id: string) => unknown }

		return hook.handler.call({ environment: { config: { root, base: '/' } } }, `${stylesheet}?url`)
	}

	it('gives the URL of the client build', () => {
		expect(load(path.join(root, 'app', 'app.css'))).toBe('export default "/assets/app-abc.css"')
	})

	it('fails for a stylesheet that the client build does not hold', () => {
		expect(() => load(path.join(root, 'app', 'other.css'))).toThrow(/no entry for/)
	})
})
