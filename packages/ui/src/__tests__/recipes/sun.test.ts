import { describe, expect, it } from 'vitest'
import { type Step, steps, sun } from '../../recipes/ryu/sun'

describe('sun', () => {
	it('exposes the canonical sm/md/lg steps', () => {
		expect(steps).toEqual(['sm', 'md', 'lg'])
	})

	it('declares every required field on every step', () => {
		const required = ['text', 'space', 'gap', 'radius', 'icon'] as const

		for (const step of steps) {
			for (const field of required) {
				expect(sun[step][field], `sun.${step}.${field} missing`).toBeDefined()
			}
		}
	})

	it('stores Tailwind token names, never classnames', () => {
		// A regression guard: classnames in `sun` would defeat the
		// "structural data only" contract that <Concentric> and kata depend on.
		for (const step of steps) {
			const fields = sun[step]

			expect(fields.text).not.toMatch(/^text-/)
			expect(fields.space).not.toMatch(/^p-/)
			expect(fields.gap).not.toMatch(/^gap-/)
			expect(fields.radius).not.toMatch(/^rounded-/)
			expect(fields.icon).not.toMatch(/^size-/)
		}
	})

	it('scales the radius monotonically across steps', () => {
		// Concentric integrity depends on each step's radius being a coherent
		// rung on the rounded-* scale — sm→md→lg in this case.
		expect(sun.sm.radius).toBe('sm')
		expect(sun.md.radius).toBe('md')
		expect(sun.lg.radius).toBe('lg')
	})

	it('Step type unions only the canonical steps', () => {
		const valid: Step = 'md'

		expect(sun[valid]).toBeDefined()
	})
})
