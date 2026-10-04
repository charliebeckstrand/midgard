import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ComponentApi } from '../../docs-legacy/engine/api-reference'
import { createApiExtractor } from '../../docs-legacy/engine/api-reference/engine/api-extractor'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

let record: Record<string, ComponentApi[]> | undefined

/**
 * The API record that the docs site ships, keyed by barrel. The docs extractor
 * makes it, with its disk cache. A cold pass takes some seconds. When the
 * source and the extractor did not change since the last pass, the record
 * comes from the cache. Each worker reads it one time.
 */
export function apiRecord(): Record<string, ComponentApi[]> {
	record ??= createApiExtractor(SRC).getAll()

	return record
}
