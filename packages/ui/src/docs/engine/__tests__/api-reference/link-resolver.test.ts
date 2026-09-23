// @vitest-environment node
import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { createLinkIndex } from '../../api-reference/engine/link-resolver'

/**
 * A ts-morph project spanning several files, mirroring the package's
 * cross-file layout. Link resolution reads declarations only, never the
 * checker's lib types, so skipping lib loading cuts most of the per-test
 * Project construction cost.
 */
function project(files: Record<string, string>): Project {
	const project = new Project({ useInMemoryFileSystem: true, skipLoadingLibFiles: true })

	for (const [name, text] of Object.entries(files)) project.createSourceFile(name, text)

	return project
}

describe('createLinkIndex', () => {
	it('resolves a target defined in another file with no import between them', () => {
		// `slots.ts` never imports `CommandPaletteItem`; TSDoc links cross files
		// regardless, so the resolver must too.
		const { resolve } = createLinkIndex(
			project({
				'item.ts': [
					`/** Selectable palette entry. */`,
					`export function CommandPaletteItem(props: { id: string }) { return null }`,
				].join('\n'),
				'slots.ts': `export function CommandPaletteShortcut(props: { keys: string }) { return null }`,
			}),
		)

		expect(resolve('CommandPaletteItem')).toBe(true)
	})

	it('resolves no unknown target', () => {
		const { resolve } = createLinkIndex(project({ 'a.ts': `export const x = 1` }))

		expect(resolve('Nope')).toBe(false)
	})

	it('skips lowercase top-level declarations', () => {
		const { resolve } = createLinkIndex(
			project({ 'a.ts': `/** helper */ export function helper() {}` }),
		)

		expect(resolve('helper')).toBe(false)
	})

	it('reports the file that declares an indexed name', () => {
		// The incremental extractor keys a barrel's cache on these paths, so a
		// cross-file link target it misses leaves that barrel's summaries stale.
		const { targetFile } = createLinkIndex(
			project({
				'item.ts': `export type KbdProps = { keys: string }`,
				'slots.ts': `/** helper */ export function helper() {}`,
			}),
		)

		expect(targetFile('KbdProps')).toBe('/item.ts')

		expect(targetFile('helper')).toBeUndefined()
	})
})
