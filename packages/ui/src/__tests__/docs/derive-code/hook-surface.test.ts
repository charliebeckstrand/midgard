import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { describe, expect, it } from 'vitest'
import { HOOK_MODULES } from '../../../docs/derive-code/internals'

const isHookName = (name: string) => name === 'use' || /^use[A-Z]/.test(name)

const reactHooks = Object.keys(React).filter(isHookName)

const reactDomHooks = Object.keys(ReactDOM).filter(isHookName)

/**
 * Guards that `HOOK_MODULES` tracks the installed React/ReactDOM hook surface
 * rather than a hand-curated list. A React minor that adds a hook flows in
 * automatically; this suite fails only if the derivation itself regresses.
 */
describe('HOOK_MODULES — derived from the installed React/ReactDOM surface', () => {
	it('enumerates a non-empty hook surface from both packages', () => {
		expect(reactHooks.length).toBeGreaterThan(0)

		expect(reactDomHooks.length).toBeGreaterThan(0)
	})

	it('maps every installed React hook to the bare react specifier', () => {
		for (const hook of reactHooks) expect(HOOK_MODULES.get(hook)).toBe('react')
	})

	it('maps react-dom-exclusive hooks to react-dom, leaving shared names on react', () => {
		for (const hook of reactDomHooks) {
			expect(HOOK_MODULES.get(hook)).toBe(reactHooks.includes(hook) ? 'react' : 'react-dom')
		}
	})

	it('covers the hooks the former hand-curated list got wrong', () => {
		// `useEffectEvent` (stabilized in React 19.2) was absent from the old
		// alternation; `useFormStatus` is a react-dom export it sourced from react.
		expect(HOOK_MODULES.get('useEffectEvent')).toBe('react')

		expect(HOOK_MODULES.get('useFormStatus')).toBe('react-dom')

		expect(HOOK_MODULES.get('use')).toBe('react')
	})
})
