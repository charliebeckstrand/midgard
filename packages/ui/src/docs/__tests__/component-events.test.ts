// @vitest-environment node
import { parseAst } from 'vite'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { componentEvent, listenComponentEvents } from '../debug/event-log/component-events.ts'
import { labelCallbacks } from '../plugin/component-events.ts'

const label = (code: string, fromModules: string[] = []) =>
	labelCallbacks(parseAst(code, { lang: 'tsx' }), code, new Set(fromModules))

/** A callback that takes any arguments. */
const spy = () => vi.fn<(...args: unknown[]) => unknown>()

/** Collects the component events while the test runs. */
function collect(): string[] {
	const texts: string[] = []

	onTestFinished(listenComponentEvents((source, text) => texts.push(`${source} ${text}`)))

	return texts
}

describe('labelCallbacks', () => {
	it('wraps each callback prop of a component with its source, and the tag and the prop as the label', () => {
		expect(label('const a = <Tabs value={v} onValueChange={(value) => set(value)} />')).toBe(
			'const a = <Tabs value={v} onValueChange={__componentEvent("component", "Tabs onValueChange", (value) => set(value))} />',
		)

		expect(label('const a = <Chat.Prompt onSubmit={send} />', ['Chat'])).toBe(
			'const a = <Chat.Prompt onSubmit={__componentEvent("module", "Chat.Prompt onSubmit", send)} />',
		)
	})

	it('wraps a component inside the callback of another component', () => {
		expect(label('<A onRender={() => <B onPick={pick} />} />')).toBe(
			'<A onRender={__componentEvent("component", "A onRender", () => <B onPick={__componentEvent("component", "B onPick", pick)} />)} />',
		)
	})

	it('leaves host elements, props that are not callbacks, and code with no callback prop', () => {
		expect(label('<div onClick={f}><Tabs once={f} /></div>')).toBeUndefined()
	})
})

describe('componentEvent', () => {
	it('gives the callback with no change while no listener is set', () => {
		const callback = spy()

		expect(componentEvent('component', 'Tabs onValueChange', callback)).toBe(callback)
	})

	it('writes each call with its arguments, and calls the callback', () => {
		const texts = collect()

		const callback = spy().mockReturnValue('kept')

		const wrapped = componentEvent('component', 'Tabs onValueChange', callback)

		expect(wrapped('Payment', { index: 1 })).toBe('kept')

		expect(callback).toHaveBeenCalledWith('Payment', { index: 1 })

		expect(texts).toEqual(['component Tabs onValueChange("Payment", {"index":1})'])
	})

	it('writes an event as its type', () => {
		const texts = collect()

		componentEvent('component', 'Button onClick', spy())(new Event('click'))

		componentEvent(
			'component',
			'Button onClick',
			spy(),
		)({ nativeEvent: new Event('click'), type: 'click' })

		expect(texts).toEqual([
			'component Button onClick("<click>")',
			'component Button onClick("<click>")',
		])
	})

	it('keeps the identity of the wrapper while the callback keeps its own', () => {
		collect()

		const callback = spy()

		expect(componentEvent('component', 'Tab onPreload', callback)).toBe(
			componentEvent('component', 'Tab onPreload', callback),
		)
	})
})
