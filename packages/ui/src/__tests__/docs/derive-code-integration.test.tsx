import { createElement, type FunctionComponent } from 'react'
import { describe, expect, it } from 'vitest'
import { deriveCode } from '../../docs/engine/derive-code'
import { GlassProvider } from '../../providers/glass'

// Integration: a real ui provider barrel tags through the docs vite pipeline
// (vitest.config.ts runs the docs plugin over ui's source), so the walker
// renders it as a recognized wrapper and emits its nested import — rather than
// transparently unwrapping it. The engine's agnostic walk behaviour is covered
// under src/docs/engine/__tests__.

/** A build-time-tagged stand-in, mirroring the docs plugin's barrel decoration. */
function tag<P>(name: string, module: string): FunctionComponent<P> {
	const Component: FunctionComponent<P> = () => null

	Object.assign(Component, { __name: name, __module: module, displayName: name })

	return Component
}

describe('deriveCode provider wrappers', () => {
	const DatePicker = tag<{ range?: boolean; placeholder?: string }>('DatePicker', 'date-picker')

	it('renders a tagged provider wrapper and emits its nested import', () => {
		const tree = createElement(
			GlassProvider,
			null,
			createElement(DatePicker, { range: true, placeholder: 'Select date range' }),
		)

		const result = deriveCode(tree)

		expect(result).toContain("import { GlassProvider } from 'ui/providers/glass'")

		expect(result).toContain("import { DatePicker } from 'ui/date-picker'")

		expect(result).toMatch(
			/<GlassProvider>\n\s+<DatePicker range placeholder="Select date range" \/>\n<\/GlassProvider>/,
		)
	})
})
