import type { Plugin } from 'vite'

// `new URL('<file>', import.meta.url)` with a literal file, the form that the
// client build of Vite resolves. A URL that a worker takes is not an asset,
// because the client build bundles the file of a worker.
const ASSET_URL =
	/(?<!\bnew\s+(?:Shared)?Worker\s*\(\s*)\bnew\s+URL\s*\(\s*('[^']+'|"[^"]+")\s*,\s*import\.meta\.url\s*\)/g

/**
 * The text of a module of the server build, with each asset URL that it
 * builds from `import.meta.url` read from an import of the file with `?url`.
 * Returns `undefined` for a module that builds no asset URL.
 *
 * Each import goes at the end of the module, after a directive such as
 * `'use client'`. An import runs before the body of its module at each place.
 */
export function importAssetUrls(code: string): string | undefined {
	const imports: string[] = []

	const result = code.replace(ASSET_URL, (_, file: string) => {
		const name = `__docsAssetUrl${imports.length}`

		imports.push(`import ${name} from ${JSON.stringify(`${file.slice(1, -1)}?url`)}`)

		return `new URL(${name}, import.meta.url)`
	})

	return imports.length > 0 ? `${result}\n${imports.join('\n')}\n` : undefined
}

/**
 * Gives `new URL('<file>', import.meta.url)` in the server build the URL of
 * the asset that the client build gives it ({@link importAssetUrls}).
 *
 * Vite resolves that form only in the client build
 * (https://vite.dev/guide/assets#new-url-url-import-meta-url). In the server
 * build, the URL stays the path of the file on the disk, and the prerender
 * writes that path into the page. An import with `?url` gives the URL of the
 * asset in each build. The server does not know the origin of the page, so
 * the path of the URL agrees with the client build, and the origin does not.
 */
export function serverAssetUrls(): Plugin {
	return {
		name: 'vite-plugin-docs-server-asset-urls',
		applyToEnvironment: (environment) => environment.config.consumer === 'server',
		transform: {
			filter: { id: { exclude: /\/node_modules\// }, code: 'import.meta.url' },
			handler(code) {
				const result = importAssetUrls(code)

				return result === undefined ? null : { code: result, map: null }
			},
		},
	}
}
