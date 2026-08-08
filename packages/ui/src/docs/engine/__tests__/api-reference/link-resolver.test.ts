import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { createLinkIndex } from '../../api-reference/engine/link-resolver'

/**
 * A ts-morph project spanning several files, mirroring the package's
 * cross-file layout. Link resolution reads declarations and JSDoc, never the
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

		const link = resolve('CommandPaletteItem')

		expect(link?.signature).toMatch(/^function CommandPaletteItem\(/)

		expect(link?.summary).toBe('Selectable palette entry.')
	})

	it('resolves a type alias to its keyword signature header', () => {
		const { resolve } = createLinkIndex(
			project({
				'kbd.ts': [
					`/** Props for the kbd component. */`,
					`export type KbdProps = { keys: string }`,
				].join('\n'),
			}),
		)

		expect(resolve('KbdProps')).toEqual({
			signature: 'type KbdProps',
			summary: 'Props for the kbd component.',
		})
	})

	it('flattens nested `{@link}` tokens inside a resolved summary', () => {
		const { resolve } = createLinkIndex(
			project({
				'a.ts': [
					`/** Same as {@link KbdProps}. */`,
					`export type AlertProps = { tone: string }`,
				].join('\n'),
			}),
		)

		expect(resolve('AlertProps')?.summary).toBe('Same as KbdProps.')
	})

	it('returns null for an unknown target and memoizes the miss', () => {
		const { resolve } = createLinkIndex(project({ 'a.ts': `export const x = 1` }))

		expect(resolve('Nope')).toBeNull()

		expect(resolve('Nope')).toBeNull()
	})

	it('skips lowercase top-level declarations', () => {
		const { resolve } = createLinkIndex(
			project({ 'a.ts': `/** helper */ export function helper() {}` }),
		)

		expect(resolve('helper')).toBeNull()
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
