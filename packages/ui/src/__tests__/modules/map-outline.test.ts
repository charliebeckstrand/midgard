// @vitest-environment node
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MAP_OUTLINE_DATA } from '../../modules/map/engine/map-outline-data'
import { buildMapOutlines } from '../helpers/map-outline-source'

const DATA_FILE = fileURLToPath(
	new URL('../../modules/map/engine/map-outline-data.ts', import.meta.url),
)

/** The data file as the build writes it. */
function dataSource(outlines: ReturnType<typeof buildMapOutlines>): string {
	const entries = Object.entries(outlines)
		.map(
			([name, { width, height, d }]) =>
				`\t${name.includes('-') ? `'${name}'` : name}: {\n\t\twidth: ${width},\n\t\theight: ${height},\n\t\td: '${d}',\n\t},`,
		)
		.join('\n')

	return `/**
 * The outlines that \`mapOutline\` reads, one for each named projection. The
 * \`map-outline\` test builds them from the atlases and checks this file against
 * the build. Do not edit it by hand: run that test with
 * \`UPDATE_MAP_OUTLINES=1\` to write it again.
 *
 * @internal
 */

import type { MapOutline } from './map-outline'
import type { MapNamedProjection } from './types'

/** @internal */
export const MAP_OUTLINE_DATA: Record<MapNamedProjection, MapOutline> = {
${entries}
}
`
}

describe('map outline data', () => {
	it('matches the outlines built from the atlases', () => {
		const built = buildMapOutlines()

		if (process.env.UPDATE_MAP_OUTLINES === '1') writeFileSync(DATA_FILE, dataSource(built))

		expect(MAP_OUTLINE_DATA).toEqual(built)
	})
})
