import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir } from '../helpers/walk-source'

// Each Dockerfile at the repository root runs `turbo prune` before the install,
// so it gets turbo through `pnpm dlx` at a pinned version. That turbo reads the
// root `turbo.json`. When the pin is older than the turbo of the repository, a
// key that only the newer turbo knows stops the deploy. `agentGuidance` did this
// in charliebeckstrand/midgard#1921.
//
// Renovate updates turbo in the lockfile and not in the Dockerfiles. Thus this
// test compares each pin to the turbo version that `pnpm-lock.yaml` installs
// for the root package.

const root = join(srcDir, '..', '..', '..')

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

describe('turbo pin in the Dockerfiles', () => {
	const locked = lockedTurbo()

	it('finds a Dockerfile', () => {
		expect(dockerfiles).not.toHaveLength(0)
	})

	it.each(dockerfiles)('%s pins turbo at the version of the lockfile', (name) => {
		const source = readFileSync(join(root, name), 'utf8')

		const pins = [...source.matchAll(/\bturbo@(\S+)/g)].map((match) => match[1])

		expect(pins, `${name} pins no turbo version`).not.toHaveLength(0)

		for (const pin of pins) {
			expect(pin, `${name}: set turbo@${pin} to turbo@${locked}`).toBe(locked)
		}
	})
})
