// @vitest-environment node
import { parseAst } from 'vite'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import {
	ARGUMENT_LENGTH,
	componentEvent,
	listenComponentEvents,
} from '../debug/event-log/component-events.ts'
import { labelProps } from '../plugin/component-events.ts'

const label = (code: string, fromModules: string[] = []) =>
	labelProps(parseAst(code, { lang: 'tsx' }), code, new Set(fromModules))

/** A callback that takes any arguments. */
const spy = () => vi.fn<(...args: unknown[]) => unknown>()

/** Collects the component events while the test runs. */
function collect(): string[] {
	const texts: string[] = []

	onTestFinished(
		listenComponentEvents((source, name, text) => texts.push(`${source} ${name} ${text}`)),
	)

	return texts
}

describe('labelProps', () => {
	it('wraps each callback prop of a component with its source, and the tag and the prop as the label', () => {
		expect(label('const a = <Tabs value="Payment" onValueChange={(value) => set(value)} />')).toBe(
			'const a = <Tabs value="Payment" onValueChange={__componentEvent("component", "Tabs", "onValueChange", (value) => set(value))} />',
		)

		expect(label('const a = <Chat.Prompt onSubmit={send} />', ['Chat'])).toBe(
			'const a = <Chat.Prompt onSubmit={__componentEvent("module", "Chat.Prompt", "onSubmit", send)} />',
		)
	})

	it('wraps a component inside the callback of another component', () => {
		expect(label('<A onRender={() => <B onPick={pick} />} />')).toBe(
			'<A onRender={__componentEvent("component", "A", "onRender", () => <B onPick={__componentEvent("component", "B", "onPick", pick)} />)} />',
		)
	})

	it('wraps each value of a component that can hold a callback, and each spread', () => {
		expect(
			label('<Grid rows={rows} sort={{ value, onValueChange: set }} {...tree} />', ['Grid']),
		).toBe(
			'<Grid rows={__componentEvent("module", "Grid", "rows", rows)} sort={__componentEvent("module", "Grid", "sort", { value, onValueChange: set })} {...__componentEvent("module", "Grid", "", tree)} />',
		)
	})

	it('leaves host elements, and the values that cannot hold a callback', () => {
		expect(
			label(
				'<div onClick={f}><Tabs key={k} ref={r} size="sm" count={2} label={`a`} icon={<I />} render={(row) => row} /></div>',
			),
		).toBeUndefined()
	})
})

describe('componentEvent', () => {
	it('gives the callback with no change while no listener is set', () => {
		const callback = spy()

		expect(componentEvent('component', 'Tabs', 'onValueChange', callback)).toBe(callback)
	})

	it('writes each call with its arguments, and calls the callback', () => {
		const texts = collect()

		const callback = spy().mockReturnValue('kept')

		const wrapped = componentEvent('component', 'Tabs', 'onValueChange', callback)

		expect(wrapped('Payment', { index: 1 })).toBe('kept')

		expect(callback).toHaveBeenCalledWith('Payment', { index: 1 })

		expect(texts).toEqual(['component Tabs onValueChange("Payment", {"index":1})'])
	})

	it('writes an event as its type', () => {
		const texts = collect()

		componentEvent('component', 'Button', 'onClick', spy())(new Event('click'))

		componentEvent(
			'component',
			'Button',
			'onClick',
			spy(),
		)({ nativeEvent: new Event('click'), type: 'click' })

		expect(texts).toEqual([
			'component Button onClick("<click>")',
			'component Button onClick("<click>")',
		])
	})

	it('writes a set as an array and a map as its entries', () => {
		const texts = collect()

		componentEvent('module', 'Grid', 'onValueChange', spy())(new Set([1, 2]), new Map([['a', 1]]))

		expect(texts).toEqual(['module Grid onValueChange([1,2], [["a",1]])'])
	})

	it('cuts a long argument', () => {
		const texts = collect()

		componentEvent(
			'component',
			'Input',
			'onChange',
			spy(),
		)('x'.repeat(ARGUMENT_LENGTH * 2), 'short')

		expect(texts).toEqual([
			`component Input onChange(${JSON.stringify('x'.repeat(ARGUMENT_LENGTH * 2)).slice(0, ARGUMENT_LENGTH)}…, "short")`,
		])
	})

	it('gives the full arguments as the detail, and no detail for a call with none', () => {
		const details: unknown[] = []

		onTestFinished(listenComponentEvents((_source, _name, _text, detail) => details.push(detail)))

		const long = 'x'.repeat(ARGUMENT_LENGTH * 2)

		componentEvent('component', 'Input', 'onChange', spy())(long, new Event('input'), undefined)

		componentEvent('component', 'Dialog', 'onClose', spy())()

		expect(details).toEqual([[long, '<input>', 'undefined'], undefined])
	})

	it('keeps the identity of the wrapper while the callback keeps its own', () => {
		collect()

		const callback = spy()

		expect(componentEvent('component', 'Tab', 'onPreload', callback)).toBe(
			componentEvent('component', 'Tab', 'onPreload', callback),
		)
	})

	it('wraps each callback in a plain object or an array, with its path', () => {
		const texts = collect()

		const set = spy()

		const sort = componentEvent('module', 'Grid', 'sort', { value: 'name', onValueChange: set })

		sort.onValueChange('age')

		expect(sort.value).toBe('name')

		expect(set).toHaveBeenCalledWith('age')

		const items = componentEvent('component', 'Menu', 'items', [
			{ key: 'a' },
			{ key: 'b', onAction: spy() },
		])

		items[1]?.onAction?.()

		const tree = componentEvent('component', 'JsonTree', '', { data: {}, onExpandedChange: spy() })

		tree.onExpandedChange(new Set(['$']))

		expect(texts).toEqual([
			'module Grid sort.onValueChange("age")',
			'component Menu items[1].onAction()',
			'component JsonTree onExpandedChange(["$"])',
		])
	})

	it('keeps a value that holds no callback, and the identity of a copy while the value keeps its own', () => {
		collect()

		const rows = [{ name: 'Ada' }]

		const render = () => null

		const element = { $$typeof: Symbol.for('react.element'), props: { onClick: spy() } }

		expect(componentEvent('module', 'Grid', 'rows', rows)).toBe(rows)

		expect(componentEvent('component', 'List', 'render', render)).toBe(render)

		expect(componentEvent('component', 'Card', 'icon', element)).toBe(element)

		const sort = { onValueChange: spy() }

		expect(componentEvent('module', 'Grid', 'sort', sort)).toBe(
			componentEvent('module', 'Grid', 'sort', sort),
		)
	})

	it('stops at a value that holds itself', () => {
		const texts = collect()

		const loop: { self?: unknown; onPick: () => void } = { onPick: spy() }

		loop.self = loop

		componentEvent('component', 'Tree', 'node', loop).onPick()

		expect(texts).toEqual(['component Tree node.onPick()'])
	})
})
