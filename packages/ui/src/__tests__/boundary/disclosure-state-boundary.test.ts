import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Checker, SymbolFlags, type Symbol as TsSymbol } from 'typescript/unstable/sync'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { openPublicProject, type PublicProject, publicBarrels } from '../helpers/public-barrels'
import { srcDir } from '../helpers/walk-source'

// Each part that has an open state stamps `data-open`, and `data-disabled`
// where it can be disabled (CONVENTIONS §3.11). The disclosure sweep in
// `sweeps/capabilities.test.tsx` checks the attributes on each subject of the
// corpus. This gate finds each barreled component whose props take `open`,
// `defaultOpen`, or `onOpenChange`, and fails when the corpus has no subject
// for it and the list below does not name it.

/** The components with an open state that have no subject, each with its reason. */
const EXEMPT = new Map([
	['Alert', 'a closed alert renders nothing, so no element holds a closed state'],
	['Banner', 'it is an Alert, and a closed alert renders nothing'],
	[
		'FloatingSurface',
		'a primitive; the Popover and Menu subjects cover its wrapper, which stamps `data-open`',
	],
	[
		'Overlay',
		'a primitive; the Dialog, Sheet, and Drawer subjects cover it, and the panel in it stamps the state',
	],
	['PanelProviders', 'it holds only context, and renders no element with an open state'],
	['PanelRoot', 'it renders no element; the Dialog, Sheet, and Drawer subjects cover its state'],
	[
		'SelectTrigger',
		'a primitive; its frame stamps `data-open`, and each picker subject covers it as `control-frame`',
	],
	['Portal', 'it renders a host only while open; the surface in it stamps the state'],
	[
		'DashboardLayout',
		'its mobile filters open in a Drawer, whose parts stamp the state; it takes no `open` prop',
	],
	[
		'SidebarLayout',
		'its mobile sidebar opens in a Drawer, whose parts stamp the state; it takes no `open` prop',
	],
])

const casesDir = join(srcDir, '__tests__', 'a11y', 'cases')

/** The symbol that an import alias names, or the symbol itself. */
function resolved(checker: Checker, symbol: TsSymbol): TsSymbol {
	return symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/** The name of each barreled component whose props take an open-state key. */
function componentsWithOpenState({ project }: PublicProject): string[] {
	const { program, checker } = project

	const found = new Set<string>()

	for (const barrel of publicBarrels()) {
		const source = program.getSourceFile(barrel)

		const module = source && checker.getSymbolAtLocation(source)

		if (!module) continue

		const exported = checker.getExportsOfModule(module)

		const names = new Set(exported.map((symbol) => symbol.name))

		for (const symbol of exported) {
			const component = symbol.name.slice(0, -'Props'.length)

			if (!symbol.name.endsWith('Props') || !names.has(component)) continue

			const props = checker.getDeclaredTypeOfSymbol(resolved(checker, symbol))

			if (
				['open', 'defaultOpen', 'onOpenChange'].some((key) => checker.getPropertyOfType(props, key))
			) {
				found.add(component)
			}
		}
	}

	return [...found].sort()
}

/** The `component` of each disclosure subject in the corpus files. */
function sweptComponents(): Set<string> {
	const swept = new Set<string>()

	for (const file of readdirSync(casesDir)) {
		if (!file.endsWith('.tsx')) continue

		const text = readFileSync(join(casesDir, file), 'utf8')

		for (const match of text.matchAll(/\bcomponent: '(\w+)'/g)) {
			if (match[1]) swept.add(match[1])
		}
	}

	return swept
}

describe('disclosure state boundary', () => {
	let opened: PublicProject

	beforeAll(() => {
		opened = openPublicProject('disclosure-state')
	})

	afterAll(() => opened?.close())

	it('the sweep covers each component with an open state, or the list names it', () => {
		const found = componentsWithOpenState(opened)

		const swept = sweptComponents()

		const missing = found.filter((name) => !swept.has(name) && !EXEMPT.has(name))

		expect(
			missing,
			`give each a \`disclosure\` subject in the corpus (CONVENTIONS §3.11):\n  ${missing.join('\n  ')}`,
		).toEqual([])

		const stale = [...EXEMPT.keys()].filter((name) => !found.includes(name) || swept.has(name))

		expect(stale, `rows that no longer apply; remove them:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
