import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ComponentApi } from '../../docs/engine/api-reference'
import { listBarrels } from '../../docs/engine/api-reference/engine/barrels'
import { apiRecord } from './api-record'
import { settled } from './settled'

// The docs plugin serves no API data in a test run, so `<Axes>` renders nothing
// there. The page gates read this module instead, and give each page that uses
// `<Axes>` the data that the site ships for its barrel.

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

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

	const barrel = listBarrels(SRC).find((candidate) => candidate.indexPath === indexPath)

	if (!barrel) return null

	return settled(apiRecord()[barrel.key] ?? [])
}
