import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ATLAS_SOURCES, type AtlasName, atlasFile, packAtlas } from '../../../scripts/atlas'

// `pnpm atlas` writes the atlas files from `us-atlas` and `world-atlas`. A new
// version of a package that does not run the script leaves files that do not
// agree with the package. Then the map draws the old regions.
//
// The comparison reads the parsed files, because Biome formats them.
describe('atlas files', () => {
	for (const atlas of Object.keys(ATLAS_SOURCES) as AtlasName[]) {
		it(`hold the ${atlas} atlas that \`pnpm atlas\` writes`, () => {
			expect(JSON.parse(readFileSync(atlasFile(atlas), 'utf8'))).toEqual(packAtlas(atlas))
		})
	}
})
