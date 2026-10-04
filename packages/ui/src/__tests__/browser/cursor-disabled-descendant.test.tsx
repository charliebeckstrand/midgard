import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { cn } from '../../core'
import { hannou } from '../../recipes/kiso'
import { present, renderUI } from '../helpers'

/**
 * An element with the shared pointer cursor refuses the pointer over a disabled descendant, in
 * both spellings of disabled.
 *
 * The `data-disabled` arm was `has-[data-disabled]`. Tailwind reads the bare word in the
 * brackets as an element name, so the rule selected a `<data-disabled>` element and never
 * matched. Only the native `:disabled` arm worked.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('the shared pointer cursor over a disabled descendant (real browser)', () => {
	function cursorOver(descendant: ReactNode) {
		const { container } = renderUI(
			<div data-testid="host" className={cn(hannou.cursor)}>
				{descendant}
			</div>,
		)

		return getComputedStyle(present(container.querySelector('[data-testid="host"]'), 'host')).cursor
	}

	it('refuses the pointer over a data-disabled descendant', () => {
		expect(cursorOver(<span data-disabled="" />)).toBe('not-allowed')
	})

	it('refuses the pointer over a natively disabled descendant', () => {
		expect(cursorOver(<input disabled aria-label="Field" />)).toBe('not-allowed')
	})

	/** The pointer still shows. A rule that matched every host would pass the two cases above. */
	it('shows the pointer over an enabled descendant', () => {
		expect(cursorOver(<span />)).toBe('pointer')
	})
})
