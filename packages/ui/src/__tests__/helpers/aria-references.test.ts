import { describe, expect, it } from 'vitest'
import { ariaTarget, ariaTargets } from './aria-references'
import { attach } from './attach'

/** Puts `html` in the document and returns the element with each id in it. */
function mount(html: string) {
	const root = attach(document.createElement('div'))

	root.innerHTML = html

	return (id: string) => {
		const found = root.querySelector(`[id="${id}"], [data-name="${id}"]`)

		if (!found) throw new Error(`no element ${id}`)

		return found
	}
}

describe('ARIA id-reference matchers', () => {
	it('passes when the attribute names the target', () => {
		const el = mount(`
			<button data-name="trigger" aria-controls="panel"></button>
			<div id="panel"></div>
		`)

		expect(el('trigger')).toControl(el('panel'))
	})

	it('fails when the attribute names another element', () => {
		const el = mount(`
			<button data-name="trigger" aria-controls="a"></button>
			<div id="a"></div>
			<div id="b"></div>
		`)

		expect(el('trigger')).not.toControl(el('b'))

		expect(() => expect(el('trigger')).toControl(el('b'))).toThrow(
			'expected aria-controls of button to name div; it names "a" (div)',
		)
	})

	it('fails when the attribute is absent', () => {
		const el = mount(`<div data-name="grid"></div><div id="cell"></div>`)

		expect(() => expect(el('grid')).toHaveActiveDescendant(el('cell'))).toThrow(
			'it names no aria-activedescendant',
		)
	})

	it('fails when the id names more than one element', () => {
		const el = mount(`
			<input data-name="field" aria-describedby="hint" />
			<p id="hint"></p>
			<p id="hint"></p>
		`)

		expect(() => expect(el('field')).toBeDescribedBy(el('hint'))).toThrow('"hint" (2 elements)')
	})

	it('checks each token of a list, in order', () => {
		const el = mount(`
			<div data-name="region" aria-labelledby="title sub"></div>
			<h2 id="title"></h2>
			<p id="sub"></p>
		`)

		expect(el('region')).toBeLabelledBy(el('title'), el('sub'))

		expect(el('region')).not.toBeLabelledBy(el('sub'), el('title'))

		expect(el('region')).not.toBeLabelledBy(el('title'))
	})

	it('refuses a target that is not an element, also under not', () => {
		const el = mount(`<button data-name="trigger" aria-controls="panel"></button>`)

		expect(() => expect(el('trigger')).toControl(null)).toThrow(
			'expected target 1 to be an element, received null',
		)

		expect(() => expect(el('trigger')).not.toControl(undefined)).toThrow(TypeError)
	})

	it('resolves an id in a detached tree', () => {
		const tree = document.createElement('div')

		tree.innerHTML = '<button aria-controls="panel"></button><div id="panel"></div>'

		const [trigger, panel] = [...tree.children]

		expect(trigger).toControl(panel)
	})
})

describe('ariaTarget', () => {
	it('returns the one element that the attribute names', () => {
		const el = mount(
			`<button data-name="trigger" aria-controls="panel"></button><div id="panel"></div>`,
		)

		expect(ariaTarget(el('trigger'), 'aria-controls')).toBe(el('panel'))
	})

	it('throws when the attribute is absent, names nothing, or names more than one element', () => {
		const el = mount(`
			<button data-name="bare"></button>
			<button data-name="dangling" aria-controls="gone"></button>
			<input data-name="field" aria-describedby="a b" />
			<p id="a"></p>
			<p id="b"></p>
		`)

		expect(() => ariaTarget(el('bare'), 'aria-controls')).toThrow('to have aria-controls')

		expect(() => ariaTarget(el('dangling'), 'aria-controls')).toThrow('"gone" (no element)')

		expect(() => ariaTarget(el('field'), 'aria-describedby')).toThrow('it names 2')

		expect(ariaTargets(el('field'), 'aria-describedby')).toEqual([el('a'), el('b')])
	})
})

describe('toHaveActiveDescendant', () => {
	it('throws on a value with whitespace, also under not, since no HTML id has it', () => {
		const el = mount(
			`<div data-name="grid" aria-activedescendant="row Team 1"></div><div id="cell"></div>`,
		)

		expect(() => expect(el('grid')).toHaveActiveDescendant(el('cell'))).toThrow('has whitespace')

		expect(() => expect(el('grid')).not.toHaveActiveDescendant(el('cell'))).toThrow(
			'has whitespace',
		)
	})

	it('throws on whitespace at the start or end, which a browser does not trim', () => {
		for (const value of [' cell', 'cell ']) {
			const el = mount(
				`<div data-name="grid" aria-activedescendant="${value}"></div><div id="cell"></div>`,
			)

			expect(() => expect(el('grid')).toHaveActiveDescendant(el('cell'))).toThrow('has whitespace')

			expect(() => ariaTarget(el('grid'), 'aria-activedescendant')).toThrow('has whitespace')
		}
	})
})
