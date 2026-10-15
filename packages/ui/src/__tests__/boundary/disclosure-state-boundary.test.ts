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
// for it and the lists below do not name it.

/**
 * The components with an open state that the sweep does not cover yet. Each
 * letter sweep gives its own components a corpus subject and removes their
 * rows, so the list only gets shorter. A new component never goes on it.
 */
const BACKLOG = new Set([
	'Collapse',
	'ColorPicker',
	'Combobox',
	'CommandPalette',
	'Confirm',
	'DashboardLayout',
	'DatePicker',
	'Dialog',
	'Drawer',
	'FloatingSurface',
	'Listbox',
	'Menu',
	'MenuSub',
	'Overlay',
	'PanelProviders',
	'PanelRoot',
	'Popover',
	'Portal',
	'Select',
	'SelectTrigger',
	'Sheet',
	'SidebarLayout',
	'Tooltip',
	'TreeItem',
])

/** The components with an open state that stamp no attribute, each with its reason. */
const EXEMPT = new Map([
	['Alert', 'a closed alert renders nothing, so no element holds a closed state'],
	['Banner', 'it is an Alert, and a closed alert renders nothing'],
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

	it('the sweep covers each component with an open state, or a list names it', () => {
		const found = componentsWithOpenState(opened)

		const swept = sweptComponents()

		const missing = found.filter(
			(name) => !swept.has(name) && !BACKLOG.has(name) && !EXEMPT.has(name),
		)

		expect(
			missing,
			`give each a \`disclosure\` subject in the corpus (CONVENTIONS §3.11):\n  ${missing.join('\n  ')}`,
		).toEqual([])

		const stale = [...BACKLOG, ...EXEMPT.keys()].filter(
			(name) => !found.includes(name) || swept.has(name),
		)

		expect(stale, `rows that no longer apply; remove them:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
