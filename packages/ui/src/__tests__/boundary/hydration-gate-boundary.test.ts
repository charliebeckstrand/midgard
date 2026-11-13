import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, workspaceRoot, workspaceSources } from '../helpers/walk-source'

// Hydration-gate boundary (CONVENTIONS.md §3.10, §3.13).
//
// A value that only the browser can read waits for hydration, so the
// hydration render has the markup of the server. `useHydrated` in `ui/hooks`
// is the one home of the gate. Before, Places wrote its own gate: a
// `useSyncExternalStore` whose subscribe never fires, with a server snapshot.
//
// So no source file calls `useSyncExternalStore` with a subscribe that never
// fires: `noopSubscribe`, or a function that returns a function with an empty
// body. A store that changes after hydration has a real subscribe, and it
// keeps its own server snapshot. A file that keeps its own gate is on the list
// below with the reason. The scan reads ui, the docs site, the apps, `auth`,
// and `shared`.

/** The one file that owns the gate. */
const HOME = 'hooks/use-hydrated.ts'

/**
 * The reason of each file below. `useHydrated` is `true` after hydration, so
 * each reader renders once more. These reads give the server value again in
 * most renders, so React skips that render.
 */
const SKIPS_RENDER = 'the client snapshot equals the server snapshot in most renders'

/** Files that keep their own gate, each with the reason. */
const KEPT: Record<string, string> = {
	'primitives/mount/use-mount.ts': `${SKIPS_RENDER}: only the \`always\` policy differs`,
	'components/tooltip/tooltip.tsx': `${SKIPS_RENDER}: the body module is not loaded yet`,
	'docs/kit/shortcut-hint.tsx': `${SKIPS_RENDER}: the build writes the Apple key`,
}

const SCAN_ROOTS = [
	srcDir,
	join(workspaceRoot, 'apps'),
	join(workspaceRoot, 'packages', 'auth'),
	join(workspaceRoot, 'packages', 'shared'),
]

/** A `useSyncExternalStore` call whose subscribe is `noopSubscribe`. */
const NOOP_CALL = /useSyncExternalStore\(\s*noopSubscribe\s*,/

/** A subscribe that never fires, written in place: a function that returns an empty function. */
const EMPTY_SUBSCRIBE = /\(\)\s*=>\s*\(\)\s*=>\s*\{\s*\}/

/** Whether a source text writes its own hydration gate. */
function writesGate(code: string): boolean {
	if (!code.includes('useSyncExternalStore(')) return false

	return NOOP_CALL.test(code) || EMPTY_SUBSCRIBE.test(code)
}

/** Every source file that writes its own hydration gate. */
function gateFiles(): Set<string> {
	const files = new Set<string>()

	for (const [file, code] of workspaceSources(SCAN_ROOTS)) {
		if (file !== HOME && writesGate(code)) files.add(file)
	}

	return files
}

describe('hydration-gate boundary', () => {
	it('finds each spelling of the gate', () => {
		expect(writesGate('useSyncExternalStore(noopSubscribe, read, server)')).toBe(true)
		expect(writesGate('useSyncExternalStore(\n\t\tnoopSubscribe,\n\t\tread,\n\t)')).toBe(true)
		expect(
			writesGate('const subscribe = () => () => {}\nuseSyncExternalStore(subscribe, a, b)'),
		).toBe(true)
		expect(writesGate('useSyncExternalStore(store.subscribe, read, read)')).toBe(false)
		expect(writesGate('useSyncExternalStore(store?.subscribe ?? noopSubscribe, a, b)')).toBe(false)
		expect(writesGate('const cleanup = () => () => {}')).toBe(false)
	})

	it('gates each value of the browser on useHydrated', () => {
		const violations = [...gateFiles()].filter((file) => !(file in KEPT))

		expect(
			violations,
			`files that write their own hydration gate (call \`useHydrated\` from \`ui/hooks\`, or list the file in KEPT with the reason):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('lists only files that still keep a gate', () => {
		const files = gateFiles()

		const stale = Object.keys(KEPT).filter((file) => !files.has(file))

		expect(stale, `KEPT entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
