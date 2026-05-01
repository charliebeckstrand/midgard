import { describe, expect, it } from 'vitest'
import { kasane } from '../../recipes/waku/kasane'

describe('kasane', () => {
	it('exposes the seven named layers plus an "all" convenience', () => {
		const required = [
			'base',
			'inset',
			'overlay',
			'hover',
			'focus',
			'validation',
			'disabled',
			'all',
		] as const

		for (const layer of required) {
			expect(kasane[layer], `missing layer: ${layer}`).toBeDefined()
		}
	})

	it('inset layer paints the ::before pseudo-element with a 1 px inset', () => {
		const inset = kasane.inset.join(' ')

		expect(inset).toContain('before:absolute')
		expect(inset).toContain('before:inset-px')
		expect(inset).toContain('before:rounded-')
	})

	it('overlay layer paints the ::after pseudo-element', () => {
		const overlay = kasane.overlay.join(' ')

		expect(overlay).toContain('after:absolute')
		expect(overlay).toContain('after:inset-0')
		expect(overlay).toContain('after:ring-transparent')
		expect(overlay).toContain('after:pointer-events-none')
	})

	it('focus layer applies the blue focus ring only when no validation state is active', () => {
		const focus = kasane.focus.join(' ')

		expect(focus).toContain('focus-within:after:ring-2')
		expect(focus).toContain('after:ring-blue-600')
		// Each blue rule must guard against the three validation states.
		expect(focus).toContain('not-has-[[data-invalid]]')
		expect(focus).toContain('not-has-[[data-warning]]')
		expect(focus).toContain('not-has-[[data-valid]]')
	})

	it('validation layer covers all three states across both rings', () => {
		const validation = kasane.validation.join(' ')

		// Each state recolours both the outer ring and the ::after overlay.
		expect(validation).toContain('has-[[data-invalid]]:ring-red-600')
		expect(validation).toContain('has-[[data-invalid]]:focus-within:after:ring-red-600')
		expect(validation).toContain('has-[[data-warning]]:ring-amber-500')
		expect(validation).toContain('has-[[data-warning]]:focus-within:after:ring-amber-500')
		expect(validation).toContain('has-[[data-valid]]:ring-green-600')
		expect(validation).toContain('has-[[data-valid]]:focus-within:after:ring-green-600')
	})

	it('hover layer is suppressed when the wrapped element is :disabled', () => {
		const hover = kasane.hover.join(' ')

		// All hover rules must guard against has-[>:disabled].
		for (const rule of kasane.hover) {
			expect(rule, `${rule} should guard against disabled`).toContain('not-has-[>:disabled]')
		}

		expect(hover).toContain('hover:ring-zinc-400')
		expect(hover).toContain('dark:hover:ring-zinc-600')
	})

	it('disabled layer dims and locks pointer when the wrapped element is :disabled', () => {
		const disabled = kasane.disabled.join(' ')

		expect(disabled).toContain('has-[>:disabled]:opacity-50')
		expect(disabled).toContain('has-[>:disabled]:cursor-not-allowed')
	})

	it('"all" composes every layer in painting order', () => {
		const concat = [
			...kasane.base,
			...kasane.inset,
			...kasane.overlay,
			...kasane.hover,
			...kasane.focus,
			...kasane.validation,
			...kasane.disabled,
		]

		expect(kasane.all).toEqual(concat)
	})
})
