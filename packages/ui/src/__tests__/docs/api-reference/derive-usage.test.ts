import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractProps } from '../../../docs/api-reference/engine/extract-props'
import type { PropDef } from '../../../docs/api-reference/types'
import { createInMemoryProgram } from './helpers'

/**
 * Runs the full extraction over `function Foo(props)` and returns the named
 * prop, so usage derivation is exercised exactly as `buildComponent` drives
 * it.
 */
function usageOf(source: string, propName: string): string | undefined {
	const { checker, sourceFiles } = createInMemoryProgram({ 'index.tsx': source })

	const sf = sourceFiles['index.tsx']

	if (!sf) throw new Error('index.tsx not found')

	const fn = sf.statements.find(
		(stmt): stmt is ts.FunctionDeclaration =>
			ts.isFunctionDeclaration(stmt) && stmt.name?.text === 'Foo',
	)

	const param = fn?.parameters[0]

	if (!fn || !param) throw new Error('No function Foo(props) in source')

	const props: PropDef[] = extractProps(
		'Foo',
		fn,
		checker.getTypeAtLocation(param),
		null,
		new Map(),
		checker,
	)

	const found = props.find((p) => p.name === propName)

	if (!found) throw new Error(`No prop named ${propName}`)

	return found.usage
}

describe('deriveUsage', () => {
	it('expands a function prop into an arrow handler with the real parameter names', () => {
		const usage = usageOf(
			[
				`type FooProps = { onValueChange?: (value: number) => void }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
			'onValueChange',
		)

		expect(usage).toBe('<Foo onValueChange={(value) => …} />')
	})

	it('keeps every parameter of a multi-parameter signature', () => {
		const usage = usageOf(
			[
				`type FooProps = { getKey: (row: unknown, index: number) => string }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
			'getKey',
		)

		expect(usage).toBe('<Foo getKey={(row, index) => …} />')
	})

	it('builds an array-of-object skeleton from the required members only', () => {
		const usage = usageOf(
			[
				`type Column = { id: string | number; title?: string; sortable?: boolean }`,
				`type FooProps = { columns: Column[] }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
			'columns',
		)

		expect(usage).toBe(`<Foo columns={[{ id: '…' }]} />`)
	})

	it('renders placeholder values by member type', () => {
		const usage = usageOf(
			[
				`type Config = { label: string; count: number; pinned: boolean; mode: 'grid' | 'list'; render: (item: string) => string }`,
				`type FooProps = { config: Config }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
			'config',
		)

		expect(usage).toBe(
			[
				'<Foo',
				'  config={{',
				`    label: '…',`,
				'    count: 0,',
				'    pinned: true,',
				`    mode: 'grid',`,
				'    render: (item) => …,',
				'  }}',
				'/>',
			].join('\n'),
		)
	})

	it('puts a long single-line value on its own line before expanding members', () => {
		const usage = usageOf(
			[
				`type FooProps = { onSomethingVeryLongHappening?: (firstValue: number, secondValue: number, thirdValue: number) => void }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
			'onSomethingVeryLongHappening',
		)

		expect(usage).toBe(
			[
				'<Foo',
				'  onSomethingVeryLongHappening={(firstValue, secondValue, thirdValue) => …}',
				'/>',
			].join('\n'),
		)
	})

	it('produces nothing for objects with no required members', () => {
		const usage = usageOf(
			[
				`type Config = { enabled?: boolean; label?: string }`,
				`type FooProps = { config?: Config }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
			'config',
		)

		expect(usage).toBeUndefined()
	})

	it('produces nothing for primitives, literal unions, and library object types', () => {
		const source = [
			`import type { CSSProperties } from 'react'`,
			`type FooProps = { size?: 'sm' | 'md'; disabled?: boolean; style?: CSSProperties }`,
			`export function Foo(props: FooProps) { return null }`,
		].join('\n')

		expect(usageOf(source, 'size')).toBeUndefined()

		expect(usageOf(source, 'disabled')).toBeUndefined()

		expect(usageOf(source, 'style')).toBeUndefined()
	})

	it('prefers an authored @example tag verbatim over generation', () => {
		const usage = usageOf(
			[
				`type FooProps = {`,
				`\t/**`,
				`\t * @example`,
				`\t * <Foo onPick={(item) => setSelection(item.id)} />`,
				`\t */`,
				`\tonPick?: (item: { id: string }) => void`,
				`}`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
			'onPick',
		)

		expect(usage).toBe('<Foo onPick={(item) => setSelection(item.id)} />')
	})
})
