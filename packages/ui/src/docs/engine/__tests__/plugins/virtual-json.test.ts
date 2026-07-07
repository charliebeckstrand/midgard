import { describe, expect, it, vi } from 'vitest'
import {
	type VirtualJsonSpec,
	virtualJsonHooks,
	virtualJsonModules,
} from '../../plugins/virtual-json'

/**
 * Minimal stand-in for the bits of the Vite dev server that the HMR hook
 * touches. `getModuleById` echoes the id back as the module; `invalidatedIds`
 * records each invalidated virtual module.
 */
function fakeServer() {
	const invalidatedIds: string[] = []

	const server = {
		moduleGraph: {
			getModuleById: (id: string) => ({ id }),
			invalidateModule: (mod: { id: string }) => {
				invalidatedIds.push(mod.id)
			},
		},
	}

	return { server, invalidatedIds }
}

type Server = ReturnType<typeof fakeServer>['server']

/**
 * The factory types its hooks as Vite `ObjectHook`s (function-or-object) so they
 * spread into a Plugin; at runtime they are plain functions. This is the
 * callable view the tests invoke them through.
 */
type Callable = {
	resolveId(id: string): string | undefined
	load(id: string): string | undefined
	handleHotUpdate(ctx: {
		file: string
		modules: { id: string }[]
		server: Server
	}): { id: string }[] | undefined
}

function build(specs: VirtualJsonSpec[]): Callable {
	return virtualJsonModules(specs) as unknown as Callable
}

describe('virtualJsonModules', () => {
	it('resolves each known id to its \\0-prefixed virtual id, and ignores others', () => {
		const hooks = build([
			{ id: 'virtual:a', generate: () => ({}), shouldInvalidate: () => false },
			{ id: 'virtual:b', generate: () => ({}), shouldInvalidate: () => false },
		])

		expect(hooks.resolveId('virtual:a')).toBe('\0virtual:a')

		expect(hooks.resolveId('virtual:b')).toBe('\0virtual:b')

		expect(hooks.resolveId('virtual:unknown')).toBeUndefined()
	})

	it('loads each module as `export default <json>` and caches the first generate', () => {
		const generate = vi.fn(() => ({ count: 1 }))

		const hooks = build([{ id: 'virtual:a', generate, shouldInvalidate: () => false }])

		expect(hooks.load('\0virtual:a')).toBe('export default {"count":1}')

		expect(hooks.load('\0virtual:a')).toBe('export default {"count":1}')

		expect(generate).toHaveBeenCalledTimes(1)
	})

	it('returns undefined when loading an unrelated id', () => {
		const hooks = build([{ id: 'virtual:a', generate: () => ({}), shouldInvalidate: () => false }])

		expect(hooks.load('\0some-real-module')).toBeUndefined()
	})

	it('invalidates only the caches whose predicate matches the changed file', () => {
		let aValue = 1

		const genA = vi.fn(() => ({ value: aValue }))

		const genB = vi.fn(() => ({ value: 'b' }))

		const hooks = build([
			{ id: 'virtual:a', generate: genA, shouldInvalidate: (f) => f.endsWith('.a') },
			{ id: 'virtual:b', generate: genB, shouldInvalidate: (f) => f.endsWith('.b') },
		])

		// Prime both caches.
		expect(hooks.load('\0virtual:a')).toBe('export default {"value":1}')

		expect(hooks.load('\0virtual:b')).toBe('export default {"value":"b"}')

		const { server, invalidatedIds } = fakeServer()

		aValue = 2

		const result = hooks.handleHotUpdate({
			file: 'changed.a',
			modules: [{ id: 'changed.a' }],
			server,
		})

		// Only A's cache is invalidated.
		expect(invalidatedIds).toEqual(['\0virtual:a'])

		// The changed file's own module is folded back in ahead of the
		// invalidated virtual module, so Vite still updates the edited file.
		expect(result?.map((m) => m.id)).toEqual(['changed.a', '\0virtual:a'])

		// A regenerates on next load; B is still served from cache.
		expect(hooks.load('\0virtual:a')).toBe('export default {"value":2}')

		expect(genA).toHaveBeenCalledTimes(2)

		expect(genB).toHaveBeenCalledTimes(1)
	})

	it('returns undefined from handleHotUpdate when no predicate matches', () => {
		const generate = vi.fn(() => ({}))

		const hooks = build([{ id: 'virtual:a', generate, shouldInvalidate: (f) => f.endsWith('.a') }])

		hooks.load('\0virtual:a')

		const { server, invalidatedIds } = fakeServer()

		expect(
			hooks.handleHotUpdate({ file: 'unrelated.ts', modules: [{ id: 'unrelated.ts' }], server }),
		).toBeUndefined()

		expect(invalidatedIds).toEqual([])

		// Cache untouched: still one generate.
		hooks.load('\0virtual:a')

		expect(generate).toHaveBeenCalledTimes(1)
	})
})

describe('virtualJsonHooks (single-module wrapper)', () => {
	it('behaves identically to a one-element virtualJsonModules call', () => {
		const generate = vi.fn(() => ({ ok: true }))

		const hooks = virtualJsonHooks({
			id: 'virtual:solo',
			generate,
			shouldInvalidate: (f) => f.endsWith('.solo'),
		}) as unknown as Callable

		expect(hooks.resolveId('virtual:solo')).toBe('\0virtual:solo')

		expect(hooks.resolveId('other')).toBeUndefined()

		expect(hooks.load('\0virtual:solo')).toBe('export default {"ok":true}')

		expect(hooks.load('\0virtual:solo')).toBe('export default {"ok":true}')

		expect(generate).toHaveBeenCalledTimes(1)

		const { server, invalidatedIds } = fakeServer()

		expect(
			hooks
				.handleHotUpdate({ file: 'x.solo', modules: [{ id: 'x.solo' }], server })
				?.map((m) => m.id),
		).toEqual(['x.solo', '\0virtual:solo'])

		expect(invalidatedIds).toEqual(['\0virtual:solo'])

		// Re-generates after invalidation.
		hooks.load('\0virtual:solo')

		expect(generate).toHaveBeenCalledTimes(2)
	})
})
