import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// ryu/ is the public substrate scale layer. It must remain below per-component
// recipes (kata/) and control primitives (waku/) — those layers consume ryu,
// not the other way around. A ryu file reaching upward would invert the
// dependency direction and pull per-component context into substrate code.

const ryuDir = join(__dirname, '../../../recipes/ryu')
const srcDir = join(__dirname, '../../..')

const INTERNAL_RECIPE_IMPORT = /from\s+['"]([^'"]*(?:\/|^)(?:kata|waku)\/[^'"]+)['"]/g

describe('ryu purity boundary', () => {
	it('ryu does not import from kata or waku', () => {
		const violations: string[] = []

		walk(ryuDir, (file, content) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

			const rel = relative(srcDir, file)

			for (const match of content.matchAll(INTERNAL_RECIPE_IMPORT)) {
				violations.push(`${rel} → ${match[1]}`)
			}
		})

		expect(violations, `ryu reaches into kata or waku:\n  ${violations.join('\n  ')}`).toEqual([])
	})
})

function walk(dir: string, visit: (file: string, content: string) => void) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.')) continue

		const path = join(dir, entry.name)

		if (entry.isDirectory()) {
			walk(path, visit)
		} else if (entry.isFile()) {
			visit(path, readFileSync(path, 'utf8'))
		}
	}
}
