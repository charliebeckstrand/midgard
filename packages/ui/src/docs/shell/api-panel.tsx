import { use } from 'react'
import { Text } from 'ui/text'
import type { DocMeta } from '../engine'
import { ApiTab } from './api/api-tab'
import { loadSnapshot, selectExports } from './api-data'

/** The API tab's data layer: resolves the doc's module in the lazy snapshot. */
export function ApiPanel({ meta }: { meta: DocMeta }) {
	const api = use(loadSnapshot())

	const moduleApi = api.modules[meta.module]

	if (!moduleApi || moduleApi.exports.length === 0) {
		return <Text severity="muted">No extracted API for this page.</Text>
	}

	return <ApiTab exports={selectExports(meta, moduleApi.exports)} />
}
