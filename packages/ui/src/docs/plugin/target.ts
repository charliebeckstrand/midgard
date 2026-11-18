import { readdir, rename } from 'node:fs/promises'
import path from 'node:path'

// The target of the docs build: the path of the site that the build is for,
// and the folder that the build goes to. Each build reads the target from the
// environment, also the build that this repository deploys, which sets no
// variable. Thus one build serves each host, and no host has a mode of its own:
//
// - `DOCS_BASE` sets the path of the site, such as `/docs/`. With no value, the
//   path is `/`. It is the `base` of Vite and the `basename` of React Router,
//   so each page, each asset, and each link is under that path.
// - `DOCS_BUILD_DIR` sets the folder of the build, relative to the folder
//   of the docs app, else `dist`. The server build imports its packages by
//   name, so the folder must be in this package, where Node finds them.

/** The target of the docs build ({@link docsTarget}). */
export type DocsTarget = {
	/** The path of the site that the build is for: `/`, or a path such as `/docs/`. */
	base: string
	/** The absolute path of the folder of the build. */
	buildDir: string
	/** The absolute path of the client folder of the build, which a host serves at the root of the site. */
	clientDir: string
}

/** The folder of the docs app. */
const APP_DIR = path.resolve(import.meta.dirname, '..')

/** The target of the docs build in `env`. */
export function docsTarget(env: NodeJS.ProcessEnv = process.env): DocsTarget {
	const trimmed = (env.DOCS_BASE ?? '').replace(/^\/+|\/+$/g, '')

	const buildDir = path.resolve(APP_DIR, env.DOCS_BUILD_DIR || 'dist')

	return {
		base: trimmed ? `/${trimmed}/` : '/',
		buildDir,
		clientDir: path.join(buildDir, 'client'),
	}
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
