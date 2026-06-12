import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractProps } from '../../../docs/api-reference/engine/extract-props'
import type { PropDef } from '../../../docs/api-reference/types'
import { createInMemoryProgram } from './helpers'

/**
 * Compiles `source` in-memory, locates the function declaration named `Foo`,
 * and runs `extractProps` over its first parameter — the same callable +
 * props-type pair `buildComponent` resolves.
 */
function propsOf(source: string): PropDef[] {
	const { checker, sourceFiles } = createInMemoryProgram({ 'index.tsx': source })

	const sf = sourceFiles['index.tsx']

	if (!sf) throw new Error('index.tsx not found')

	const fn = sf.statements.find(
		(stmt): stmt is ts.FunctionDeclaration =>
			ts.isFunctionDeclaration(stmt) && stmt.name?.text === 'Foo',
	)

	const param = fn?.parameters[0]

	if (!fn || !param) throw new Error('No function Foo(props) in source')

	return extractProps('Foo', fn, checker.getTypeAtLocation(param), null, new Map(), checker)
}

function prop(props: PropDef[], name: string): PropDef {
	const found = props.find((p) => p.name === name)

	if (!found) throw new Error(`No prop named ${name}`)

	return found
}

describe('extractProps', () => {
	it('extracts the JSDoc summary as `description`; undocumented props get none', () => {
		const props = propsOf(
			[
				`type FooProps = {`,
				`\t/** Disables interaction and dims the control. */`,
				`\tdisabled?: boolean`,
				`\tlabel?: string`,
				`}`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
		)

		expect(prop(props, 'disabled').description).toBe('Disables interaction and dims the control.')

		expect(prop(props, 'label').description).toBeUndefined()
	})

	it('joins a multi-line JSDoc body into one description', () => {
		const props = propsOf(
			[
				`type FooProps = {`,
				`\t/**`,
				`\t * First line of the summary`,
				`\t * continues on the second.`,
				`\t */`,
				`\tvalue?: number`,
				`}`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
		)

		expect(prop(props, 'value').description).toBe(
			'First line of the summary\ncontinues on the second.',
		)
	})

	it('marks non-optional props `required`; optional props omit the field', () => {
		const props = propsOf(
			[
				`type FooProps = { label: string; size?: 'sm' | 'md' }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
		)

		expect(prop(props, 'label').required).toBe(true)

		expect(prop(props, 'size').required).toBeUndefined()
	})

	it('treats union-arm-only props as optional even when declared without `?`', () => {
		const props = propsOf(
			[
				`type FooProps =`,
				`\t| { mode: 'a'; valueA: string }`,
				`\t| { mode: 'b'; valueB: number }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
		)

		// `mode` exists (non-optional) in every arm; the arm-discriminated
		// values cannot be required of every caller.
		expect(prop(props, 'mode').required).toBe(true)

		expect(prop(props, 'valueA').required).toBeUndefined()

		expect(prop(props, 'valueB').required).toBeUndefined()
	})

	it('dedupes top-level union arms collected from overlapping arm types', () => {
		const props = propsOf(
			[
				`type FooProps =`,
				`\t| { type?: 'single'; value?: string | null }`,
				`\t| { type: 'multiple'; value?: string | null }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
		)

		// The union-merged type and each arm's narrowed type overlap; the
		// rendering keeps one copy of every arm.
		expect(prop(props, 'type').type).toBe(`'single' | 'multiple'`)

		expect(prop(props, 'value').type).toBe('null | string')
	})

	it('keeps function renderings whole when joining arm types', () => {
		const props = propsOf(
			[
				`type FooProps =`,
				`\t| { mode: 'a'; pick?: (row: unknown) => string | number }`,
				`\t| { mode: 'b'; pick?: (row: unknown) => string | number }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
		)

		expect(prop(props, 'pick').type).toBe('(row: unknown) => string | number')
	})

	it('keeps `required` for non-optional props inside intersection arms', () => {
		const props = propsOf(
			[
				`type Base = { id: string }`,
				`type FooProps = Base & { size?: 'sm' | 'md' }`,
				`export function Foo(props: FooProps) { return null }`,
			].join('\n'),
		)

		expect(prop(props, 'id').required).toBe(true)
	})
})
