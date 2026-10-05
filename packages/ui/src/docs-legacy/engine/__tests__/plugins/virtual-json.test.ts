// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
	type VirtualJsonFamilySpec,
	type VirtualJsonSpec,
	virtualJsonModules,
} from '../../plugins/virtual-json'

/**
 * Minimal stand-in for the bits of the Vite dev server that the HMR hook
 * touches. `getModuleById` echoes the id back as the module; `invalidatedIds`
 * records each invalidated virtual module, `reloadedIds` each reloaded one, and
 * `errors` each logged error.
 */
function fakeServer() {
	const invalidatedIds: string[] = []

	const reloadedIds: string[] = []

	const errors: string[] = []

	const server = {
		moduleGraph: {
			getModuleById: (id: string) => ({ id }),
			invalidateModule: (mod: { id: string }) => {
				invalidatedIds.push(mod.id)
			},
		},
		reloadModule: async (mod: { id: string }) => {
			reloadedIds.push(mod.id)
		},
		config: {
			logger: {
				error: (message: string) => {
					errors.push(message)
				},
			},
		},
	}

	return { server, invalidatedIds, reloadedIds, errors }
}

/** Let the background regeneration of a family settle. */
async function settle() {
	await new Promise((resolve) => setTimeout(resolve, 0))
}

type Server = ReturnType<typeof fakeServer>['server']

/**
 * The factory types its hooks as Vite `ObjectHook`s (function-or-object) so they
 * spread into a Plugin; at runtime they are plain functions. This is the
 * callable view the tests invoke them through.
 */
type Callable = {
	resolveId(id: string): string | undefined
	load(id: string): string | Promise<string> | undefined
	handleHotUpdate(ctx: {
		file: string
		modules: { id: string }[]
		server: Server
	}): { id: string }[] | undefined
}

function build(specs: (VirtualJsonSpec | VirtualJsonFamilySpec)[]): Callable {
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

	it('invalidates nothing when a matching change leaves the JSON as it was', () => {
		const generate = vi.fn(() => ({ value: 1 }))

		const hooks = build([{ id: 'virtual:a', generate, shouldInvalidate: () => true }])

		hooks.load('\0virtual:a')

		const { server, invalidatedIds } = fakeServer()

		// No virtual module joins the update, so Vite keeps its own: the edit
		// stays a Fast Refresh.
		expect(
			hooks.handleHotUpdate({ file: 'demo.tsx', modules: [{ id: 'demo.tsx' }], server }),
		).toBeUndefined()

		expect(invalidatedIds).toEqual([])

		expect(generate).toHaveBeenCalledTimes(2)
	})

	it('generates nothing on a matching change to a module never served', () => {
		const generate = vi.fn(() => ({ value: 1 }))

		const hooks = build([{ id: 'virtual:a', generate, shouldInvalidate: () => true }])

		const { server, invalidatedIds } = fakeServer()

		hooks.handleHotUpdate({ file: 'demo.tsx', modules: [{ id: 'demo.tsx' }], server })

		expect(invalidatedIds).toEqual([])

		expect(generate).not.toHaveBeenCalled()
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

describe('virtualJsonModules (family spec)', () => {
	const family = (
		generate: () => Record<string, unknown> | Promise<Record<string, unknown>>,
		shouldInvalidate: (f: string) => boolean = () => false,
		keys: () => string[] = () => ['button', 'card'],
	): VirtualJsonFamilySpec => ({
		prefix: 'virtual:api/',
		manifestId: 'virtual:api-manifest',
		keys,
		generate,
		shouldInvalidate,
	})

	it('resolves the manifest id and any prefixed key, ignoring others', () => {
		const hooks = build([family(() => ({ button: [], card: [] }))])

		expect(hooks.resolveId('virtual:api-manifest')).toBe('\0virtual:api-manifest')

		expect(hooks.resolveId('virtual:api/button')).toBe('\0virtual:api/button')

		expect(hooks.resolveId('virtual:api/anything')).toBe('\0virtual:api/anything')

		expect(hooks.resolveId('virtual:other')).toBeUndefined()
	})

	it('serves the manifest from the keys alone, without the record', () => {
		const generate = vi.fn(() => ({}))

		const hooks = build([family(generate)])

		expect(hooks.load('\0virtual:api-manifest')).toBe(
			'export default {"button": () => import("virtual:api/button"),' +
				'"card": () => import("virtual:api/card")}',
		)

		expect(generate).not.toHaveBeenCalled()
	})

	it('serves each key module as its slice of the record, once the record resolves', async () => {
		const record = { button: [{ name: 'Button' }], card: [] }

		const hooks = build([family(async () => record)])

		await expect(hooks.load('\0virtual:api/button')).resolves.toBe(
			'export default [{"name":"Button"}]',
		)

		await expect(hooks.load('\0virtual:api/card')).resolves.toBe('export default []')

		// An id with no record entry serves null rather than throwing.
		await expect(hooks.load('\0virtual:api/missing')).resolves.toBe('export default null')
	})

	it('generates the record once across every key read', async () => {
		const generate = vi.fn(() => ({ button: [], card: [] }))

		const hooks = build([family(generate)])

		await Promise.all([hooks.load('\0virtual:api/button'), hooks.load('\0virtual:api/card')])

		await hooks.load('\0virtual:api/button')

		expect(generate).toHaveBeenCalledTimes(1)
	})

	it('fails each key read when the record fails', async () => {
		const hooks = build([
			family(() => {
				throw new Error('no record')
			}),
		])

		await expect(hooks.load('\0virtual:api/button')).rejects.toThrow('no record')

		await expect(hooks.load('\0virtual:api/card')).rejects.toThrow('no record')
	})

	it('re-generates after the update, and reloads a served key whose slice changed', async () => {
		let props: unknown[] = [{ name: 'Button' }]

		const generate = vi.fn(() => ({ button: props, card: [] }))

		const hooks = build([family(generate, (f) => f.endsWith('.tsx'))])

		hooks.load('\0virtual:api-manifest')

		await hooks.load('\0virtual:api/button')

		await hooks.load('\0virtual:api/card')

		const { server, invalidatedIds, reloadedIds } = fakeServer()

		props = [{ name: 'Button', updated: true }]

		// The key list holds, so no virtual module joins the edit's own update.
		expect(
			hooks.handleHotUpdate({ file: 'button.tsx', modules: [{ id: 'button.tsx' }], server }),
		).toBeUndefined()

		await settle()

		// Only the key whose slice changed reloads.
		expect(invalidatedIds).toEqual([])

		expect(reloadedIds).toEqual(['\0virtual:api/button'])

		await expect(hooks.load('\0virtual:api/button')).resolves.toBe(
			'export default [{"name":"Button","updated":true}]',
		)

		expect(generate).toHaveBeenCalledTimes(2)
	})

	it('serves the new record to a key read that starts during the regeneration', async () => {
		let version = 1

		const hooks = build([
			family(
				async () => ({ button: version }),
				() => true,
			),
		])

		await hooks.load('\0virtual:api/button')

		const { server } = fakeServer()

		version = 2

		hooks.handleHotUpdate({ file: 'button.tsx', modules: [], server })

		await expect(hooks.load('\0virtual:api/button')).resolves.toBe('export default 2')
	})

	it('reloads each served key when the previous record failed', async () => {
		let fail = false

		const hooks = build([
			family(
				() => {
					if (fail) throw new Error('broken')

					return { button: [], card: [] }
				},
				() => true,
			),
		])

		await hooks.load('\0virtual:api/button')

		await hooks.load('\0virtual:api/card')

		const { server, reloadedIds } = fakeServer()

		fail = true

		hooks.handleHotUpdate({ file: 'button.tsx', modules: [], server })

		await settle()

		fail = false

		hooks.handleHotUpdate({ file: 'button.tsx', modules: [], server })

		await settle()

		// Neither slice changed, but the failed record gave no slice to compare.
		expect(reloadedIds).toEqual(['\0virtual:api/button', '\0virtual:api/card'])
	})

	it('logs a regeneration that fails, and reloads nothing', async () => {
		let fail = false

		const hooks = build([
			family(
				() => {
					if (fail) throw new Error('broken')

					return { button: [] }
				},
				() => true,
			),
		])

		await hooks.load('\0virtual:api/button')

		const { server, reloadedIds, errors } = fakeServer()

		fail = true

		hooks.handleHotUpdate({ file: 'button.tsx', modules: [], server })

		await settle()

		expect(reloadedIds).toEqual([])

		expect(errors).toEqual(['virtual:api-manifest: Error: broken'])
	})

	it('invalidates the manifest in the update when the key list changes', async () => {
		let keys = ['button', 'card']

		let record: Record<string, unknown> = { button: [], card: [] }

		const hooks = build([
			family(
				() => record,
				() => true,
				() => keys,
			),
		])

		hooks.load('\0virtual:api-manifest')

		await hooks.load('\0virtual:api/button')

		await hooks.load('\0virtual:api/card')

		const { server, invalidatedIds, reloadedIds } = fakeServer()

		keys = ['button', 'card', 'dialog']

		record = { button: [], card: [{ name: 'Card' }], dialog: [] }

		const result = hooks.handleHotUpdate({
			file: 'dialog.tsx',
			modules: [{ id: 'dialog.tsx' }],
			server,
		})

		// The manifest joins the edit's own update, after the edited file.
		expect(invalidatedIds).toEqual(['\0virtual:api-manifest'])

		expect(result?.map((m) => m.id)).toEqual(['dialog.tsx', '\0virtual:api-manifest'])

		expect(hooks.load('\0virtual:api-manifest')).toContain(
			'"dialog": () => import("virtual:api/dialog")',
		)

		await settle()

		// Of the served keys, only card changed.
		expect(reloadedIds).toEqual(['\0virtual:api/card'])
	})

	it('generates nothing on a matching change to a family never served', async () => {
		const generate = vi.fn(() => ({ button: [] }))

		const keys = vi.fn(() => ['button'])

		const hooks = build([family(generate, () => true, keys)])

		const { server, invalidatedIds, reloadedIds } = fakeServer()

		hooks.handleHotUpdate({ file: 'button.tsx', modules: [], server })

		await settle()

		expect(invalidatedIds).toEqual([])

		expect(reloadedIds).toEqual([])

		expect(generate).not.toHaveBeenCalled()

		expect(keys).not.toHaveBeenCalled()
	})

	it('leaves the family untouched when no predicate matches', async () => {
		const generate = vi.fn(() => ({ button: [] }))

		const hooks = build([family(generate, (f) => f.endsWith('.tsx'))])

		hooks.load('\0virtual:api-manifest')

		await hooks.load('\0virtual:api/button')

		const { server, invalidatedIds, reloadedIds } = fakeServer()

		expect(
			hooks.handleHotUpdate({ file: 'notes.md', modules: [{ id: 'notes.md' }], server }),
		).toBeUndefined()

		await settle()

		expect(invalidatedIds).toEqual([])

		expect(reloadedIds).toEqual([])

		// Cache intact: still a single generate.
		expect(generate).toHaveBeenCalledTimes(1)
	})
})
