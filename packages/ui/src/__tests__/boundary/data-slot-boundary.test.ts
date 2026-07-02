import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// The slot override is exposed as the native `data-slot` attribute everywhere:
// DOM attribute, component prop, and call site. A single token is greppable
// across the package; this guard fails on any camelCase prop spelling.
//
// The banned identifier is assembled at runtime so this file stays clean of the
// token it forbids and doesn't flag itself during the scan.
const FORBIDDEN = ['data', 'Slot'].join('')

const srcDir = join(__dirname, '../..')

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo'])

function collect(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) collect(join(dir, entry.name), out)

			continue
		}

		if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
			out.push(join(dir, entry.name))
		}
	}

	return out
}

describe('data-slot convention', () => {
	const pattern = new RegExp(`\\b${FORBIDDEN}\\b`)

	const offenders = collect(srcDir)
		.filter((file) => pattern.test(readFileSync(file, 'utf8')))
		.map((file) => relative(srcDir, file))

	it(`uses the native data-slot attribute everywhere (no ${FORBIDDEN} prop)`, () => {
		expect(
			offenders,
			`found the banned \`${FORBIDDEN}\` identifier — expose the slot as the native \`data-slot\` attribute instead:\n${offenders
				.map((p) => `  ${p}`)
				.join('\n')}`,
		).toEqual([])
	})
})
