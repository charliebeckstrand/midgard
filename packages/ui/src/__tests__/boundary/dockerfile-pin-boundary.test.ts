import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir } from '../helpers/walk-source'

// Each Dockerfile at the repository root installs pnpm at a pinned version, and
// runs `turbo prune` through `pnpm dlx` at a pinned version. Renovate updates
// pnpm in the `packageManager` field and turbo in the lockfile, but not in the
// Dockerfiles. A pin that falls behind can stop the deploy. In
// charliebeckstrand/midgard#1921, an old turbo did not know a key of the root
// `turbo.json`. Thus each pin must equal the version that the repository uses.

const root = join(srcDir, '..', '..', '..')

/** The pnpm version in the `packageManager` field of the root `package.json`. */
function managedPnpm(): string {
	const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

	// The field can end in a hash, as in `pnpm@12.8.1+sha512.…`.
	const version = String(manifest.packageManager ?? '').match(/^pnpm@([^+]+)/)?.[1]

	if (!version) throw new Error('package.json gives no pnpm version in `packageManager`')

	return version
}

/** The turbo version that `pnpm-lock.yaml` installs for the root package. */
function lockedTurbo(): string {
	const lock = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8')

	// A root importer runs from `  .:` to the next blank line. The lockfile has
	// two: one for the pnpm of the repository, and one for the workspace.
	const importers = [...lock.matchAll(/^ {2}\.:\n([\s\S]*?)\n\n/gm)].map((match) => match[1])

	const version = importers
		.map((block) => block?.match(/^ {6}turbo:\n {8}specifier: .+\n {8}version: (\S+)$/m)?.[1])
		.find((found) => found !== undefined)

	if (!version) throw new Error('pnpm-lock.yaml gives no turbo version for the root package')

	return version
}

const dockerfiles = readdirSync(root).filter((name) => /^Dockerfile(\.|$)/.test(name))

const tools = [
	['pnpm', managedPnpm()],
	['turbo', lockedTurbo()],
] as const

describe('tool pins in the Dockerfiles', () => {
	it('finds a Dockerfile', () => {
		expect(dockerfiles).not.toHaveLength(0)
	})

	describe.each(dockerfiles)('%s', (name) => {
		const source = readFileSync(join(root, name), 'utf8')

		it.each(tools)('pins %s at the version of the repository', (tool, version) => {
			const pins = [...source.matchAll(new RegExp(`\\b${tool}@(\\S+)`, 'g'))].map(
				(match) => match[1],
			)

			expect(pins, `${name} pins no ${tool} version`).not.toHaveLength(0)

			for (const pin of pins) {
				expect(pin, `${name}: set ${tool}@${pin} to ${tool}@${version}`).toBe(version)
			}
		})
	})
})
