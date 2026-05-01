import { describe, expect, it } from 'vitest'
import { ji } from '../../recipes/ryu/ji'
import { classes, type Step, steps, sun } from '../../recipes/ryu/sun'

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
		// rung on the maru.rounded scale — md→lg→xl in this case.
		expect(sun.sm.radius).toBe('md')
		expect(sun.md.radius).toBe('lg')
		expect(sun.lg.radius).toBe('xl')
	})

	it('Step type unions only the canonical steps', () => {
		const valid: Step = 'md'

		expect(sun[valid]).toBeDefined()
	})
})

describe('sun.classes', () => {
	it('delegates text+leading to ji.size to keep them bundled', () => {
		expect(classes('sm').text).toBe(ji.size.sm)
		expect(classes('md').text).toBe(ji.size.md)
		expect(classes('lg').text).toBe(ji.size.lg)
	})

	it('produces Tailwind padding, gap, and rounded utilities for each step', () => {
		const md = classes('md')

		expect(md.padding).toBe(`p-${sun.md.space}`)
		expect(md.gap).toBe(`gap-${sun.md.gap}`)
		expect(md.rounded).toBe(`rounded-${sun.md.radius}`)
	})

	it('targets the data-slot="icon" descendant for icon sizing and shrink-0', () => {
		const md = classes('md')

		expect(md.icon).toContain(`*:data-[slot=icon]:size-${sun.md.icon}`)
		expect(md.icon).toContain('*:data-[slot=icon]:shrink-0')
	})

	it('updates derived classes when sun fields change', () => {
		// The whole point of routing through `classes()` is that a single
		// edit to a sun field reaches every consumer's rendered class. This
		// test pins the contract: the field is the source, the class is the
		// derivation.
		for (const step of steps) {
			const c = classes(step)

			expect(c.padding).toBe(`p-${sun[step].space}`)
			expect(c.rounded).toBe(`rounded-${sun[step].radius}`)
		}
	})
})
