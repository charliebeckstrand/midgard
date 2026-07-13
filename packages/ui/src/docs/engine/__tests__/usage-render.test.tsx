import { isValidElement, type ReactElement } from 'react'
import type { UsageDoc } from '../usage'
import { renderUsage } from '../usage/render'

/** A stand-in component; identity is all the structural assertions need. */
function Mock(): null {
	return null
}

/** The element `renderUsage` produced for `doc`, resolving every tag to {@link Mock}. */
function render(doc: UsageDoc): { type: unknown; props: Record<string, unknown> } {
	const element = renderUsage(doc, () => Mock) as ReactElement

	if (!isValidElement(element)) throw new Error('expected an element')

	return { type: element.type, props: element.props as Record<string, unknown> }
}

describe('renderUsage', () => {
	it('builds a createElement tree for a component showcase', () => {
		const element = render({
			imports: [{ names: ['Widget'], from: 'ui/widget' }],
			body: [
				{
					s: 'show',
					value: {
						e: 'jsx',
						tag: 'Widget',
						attrs: [
							{ name: 'variant', value: { e: 'str', value: 'soft' } },
							{ name: 'block', value: null },
						],
						children: [{ e: 'text', value: 'Save' }],
					},
				},
			],
		})

		expect(element.type).toBe(Mock)

		expect(element.props).toMatchObject({ variant: 'soft', block: true, children: 'Save' })
	})

	it('binds a hoisted const and references it by identifier', () => {
		const element = render({
			imports: [],
			body: [
				{
					s: 'const',
					name: 'rows',
					value: {
						e: 'array',
						items: [{ e: 'object', fields: [{ key: 'id', value: { e: 'str', value: 'a1' } }] }],
					},
				},
				{
					s: 'show',
					value: {
						e: 'jsx',
						tag: 'Grid',
						attrs: [{ name: 'rows', value: { e: 'ident', name: 'rows' } }],
						children: [],
					},
				},
			],
		})

		expect(element.props.rows).toEqual([{ id: 'a1' }])
	})

	it('throws on an unresolved tag so the boundary falls back to code', () => {
		const doc: UsageDoc = {
			imports: [],
			body: [{ s: 'show', value: { e: 'jsx', tag: 'Missing', attrs: [], children: [] } }],
		}

		expect(() => renderUsage(doc, () => undefined)).toThrow(/unresolved component <Missing>/)
	})

	it('throws on a hook binding, which needs a harness', () => {
		const doc: UsageDoc = {
			imports: [],
			body: [
				{
					s: 'destructure',
					names: ['value', 'setValue'],
					value: { e: 'call', callee: 'useX', args: [] },
				},
			],
		}

		expect(() => renderUsage(doc, () => Mock)).toThrow(/harness/)
	})
})
