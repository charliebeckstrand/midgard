import { readdir, rename } from 'node:fs/promises'
import path from 'node:path'

// The docs build can be for a path of a site other than the root, such as
// `/docs/`. The `DOCS_BASE` variable sets that path. It is the `base` of Vite
// and the `basename` of React Router. Thus each page, each asset, and each link
// is under that path. With no `DOCS_BASE`, the path is `/`, and the build does
// not change.

/** The path of the site that the docs build is for: `/`, or a path such as `/docs/`. */
export function docsBase(): string {
	const trimmed = (process.env.DOCS_BASE ?? '').replace(/^\/+|\/+$/g, '')

	return trimmed ? `/${trimmed}/` : '/'
}

/**
 * The folder of the docs build, relative to the folder of the docs app: the
 * `DOCS_BUILD_DIRECTORY` variable, else `dist`. `test:docs-build` sets it, so
 * that a build with a base goes next to the build that the suite serves.
 */
export function docsBuildDirectory(): string {
	return process.env.DOCS_BUILD_DIRECTORY || 'dist'
}

/** The name of the fallback document of the build, as the server of the docs reads it. */
const FALLBACK = '__spa-fallback.html'

/**
 * Moves each file that the build writes at the root of `clientDir` into the
 * folder of `base`, such as `client/docs/`. Thus `clientDir` agrees with the
 * paths of the site, and a static host that serves `clientDir` at its root
 * serves the build. With the base `/`, the function does nothing.
 *
 * React Router writes each page under `base`. Vite writes the assets in
 * `assets/` at the root of `clientDir`, but their URLs are under `base`.
 * React Router writes the fallback document at the root too. It gives the
 * fallback the name `index.html` when the root has no page, which is always
 * true with a base. The fallback gets its name again, as in a build with no
 * base.
 */
export async function moveUnderBase(clientDir: string, base: string): Promise<void> {
	const [top] = base.split('/').filter(Boolean)

	if (top === undefined) return

	const folder = path.join(clientDir, base)

	await rename(path.join(clientDir, 'index.html'), path.join(folder, FALLBACK))

	for (const entry of await readdir(clientDir)) {
		if (entry !== top) await rename(path.join(clientDir, entry), path.join(folder, entry))
	}
}
