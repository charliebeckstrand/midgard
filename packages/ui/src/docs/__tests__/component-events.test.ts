// @vitest-environment node
import { parseAst } from 'vite'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { componentEvent, listenComponentEvents } from '../debug/event-log/component-events.ts'
import { labelCallbacks } from '../plugin/component-events.ts'

const label = (code: string) => labelCallbacks((source, options) => parseAst(source, options), code)

/** A callback that takes any arguments. */
const spy = () => vi.fn<(...args: unknown[]) => unknown>()

/** Collects the component events while the test runs. */
function collect(): string[] {
	const texts: string[] = []

	onTestFinished(listenComponentEvents((text) => texts.push(text)))

	return texts
}

describe('labelCallbacks', () => {
	it('wraps each callback prop of a component with the tag and the prop as the label', () => {
		expect(label('const a = <Tabs value={v} onValueChange={(value) => set(value)} />')).toBe(
			'const a = <Tabs value={v} onValueChange={__componentEvent("Tabs onValueChange", (value) => set(value))} />',
		)

		expect(label('const a = <Chat.Prompt onSubmit={send} />')).toBe(
			'const a = <Chat.Prompt onSubmit={__componentEvent("Chat.Prompt onSubmit", send)} />',
		)
	})

	it('wraps a component inside the callback of another component', () => {
		expect(label('<A onRender={() => <B onPick={pick} />} />')).toBe(
			'<A onRender={__componentEvent("A onRender", () => <B onPick={__componentEvent("B onPick", pick)} />)} />',
		)
	})

	it('leaves host elements, props that are not callbacks, and code with no callback prop', () => {
		expect(label('<div onClick={f}><Tabs once={f} /></div>')).toBeUndefined()
	})
})

describe('componentEvent', () => {
	it('gives the callback with no change while no listener is set', () => {
		const callback = spy()

		expect(componentEvent('Tabs onValueChange', callback)).toBe(callback)
	})

	it('writes each call with its arguments, and calls the callback', () => {
		const texts = collect()

		const callback = spy().mockReturnValue('kept')

		const wrapped = componentEvent('Tabs onValueChange', callback)

		expect(wrapped('Payment', { index: 1 })).toBe('kept')

		expect(callback).toHaveBeenCalledWith('Payment', { index: 1 })

		expect(texts).toEqual(['Tabs onValueChange("Payment", {"index":1})'])
	})

	it('writes an event as its type', () => {
		const texts = collect()

		componentEvent('Button onClick', spy())(new Event('click'))

		componentEvent('Button onClick', spy())({ nativeEvent: new Event('click'), type: 'click' })

		expect(texts).toEqual(['Button onClick("<click>")', 'Button onClick("<click>")'])
	})

	it('keeps the identity of the wrapper while the callback keeps its own', () => {
		collect()

		const callback = spy()

		expect(componentEvent('Tab onPreload', callback)).toBe(
			componentEvent('Tab onPreload', callback),
		)
	})
})
