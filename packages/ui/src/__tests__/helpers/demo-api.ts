import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Project } from 'ts-morph'
import type { ComponentApi } from '../../docs/engine/api-reference'
import { extractBarrel, openProject } from '../../docs/engine/api-reference/engine/build-api'

// The docs plugin serves no API data in a test run, so `<Axes>` renders nothing
// there. The page gates read this module instead, and give each page that uses
// `<Axes>` the data that the site ships for its barrel.

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// One project for each worker. It opens on the first page that needs it.
let project: Project | undefined

type Settled<T> = Promise<T> & { status: 'fulfilled'; value: T }

/** A fulfilled promise that `use()` reads with no suspend. */
function settled<T>(value: T): Settled<T> {
	return Object.assign(Promise.resolve(value), { status: 'fulfilled' as const, value })
}

/**
 * The API data of the barrel that a page documents, for `DemoApiContext`. It
 * returns `null` when the demo does not use `<Axes>`, or when the page has no
 * barrel.
 *
 * @param page - The page name, such as `components/button`.
 */
export function demoApiOf(page: string): Promise<ComponentApi[]> | null {
	const demo = [
		join(SRC, 'docs', 'demos', `${page}.tsx`),
		join(SRC, 'docs', 'demos', page, 'index.tsx'),
	].find(existsSync)

	if (!demo || !readFileSync(demo, 'utf8').includes('<Axes')) return null

	const indexPath = join(SRC, page, 'index.ts')

	if (!existsSync(indexPath)) return null

	project ??= openProject(SRC)

	const api = extractBarrel(project, project.getTypeChecker().compilerObject, indexPath)

	return settled(api ?? [])
}
