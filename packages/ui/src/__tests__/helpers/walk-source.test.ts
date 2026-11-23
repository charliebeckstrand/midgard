// @vitest-environment node

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { walkSource } from './walk-source'

// A build tool writes a temporary file at the root of a package and removes it
// again, as tsup does with `tsup.config.bundled_*.mjs`. A walk that lists the
// file and then reads it after the removal fails with `ENOENT`. Each case
// removes the file in `accept`, at the moment that the walk comes to it, so
// the race occurs on each run.
describe('walkSource', () => {
	let root: string

	let source: string

	let bundled: string

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'walk-source-'))

		source = join(root, 'main.ts')

		bundled = join(root, 'tsup.config.bundled_probe.mjs')

		writeFileSync(source, 'export {}\n')

		writeFileSync(bundled, 'export default {}\n')
	})

	afterEach(() => {
		rmSync(root, { recursive: true, force: true })
	})

	/** Removes the bundled file, as the build does, and accepts each file that `keep` names. */
	function removeBundled(keep: (file: string) => boolean) {
		return (file: string) => {
			if (file === bundled) rmSync(bundled)

			return keep(file)
		}
	}

	it('reads no file that `accept` rejects, so a removed file does not fail the walk', () => {
		const visited: string[] = []

		walkSource(
			root,
			(file) => visited.push(file),
			undefined,
			removeBundled((file) => file.endsWith('.ts')),
		)

		expect(visited).toEqual([source])
	})

	it('fails on a removed file that `accept` lets through', () => {
		expect(() =>
			walkSource(
				root,
				() => {},
				undefined,
				removeBundled(() => true),
			),
		).toThrow(/ENOENT/)
	})
})
