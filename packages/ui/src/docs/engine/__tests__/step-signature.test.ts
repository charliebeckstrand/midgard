import { describe, expect, it } from 'vitest'
import type { DensityStep } from '../../../core/density'
import { stepSignature } from '../step-signature'

/**
 * Render one axis instance: a wrapper that holds `html`, in which `{step}`
 * becomes the step of the instance.
 */
function instance(html: string, step: DensityStep): Element {
	const wrapper = document.createElement('div')

	wrapper.setAttribute('data-slot', 'axis-value')

	wrapper.innerHTML = html.replaceAll('{step}', step)

	return wrapper
}

/** Whether `html` renders the same at two steps. */
function same(html: string, a: DensityStep, b: DensityStep): boolean {
	const first = stepSignature(instance(html, a), a, 'A')

	const second = stepSignature(instance(html, b), b, 'B')

	expect(first).not.toBeNull()

	return first === second
}

describe('stepSignature', () => {
	it('reads a stepped class of three values as one value for each outer step and its neighbor', () => {
		const html = '<div data-density="{step}" class="density-h-[2,3,4] w-48"></div>'

		expect(same(html, 'xs', 'sm')).toBe(true)

		expect(same(html, 'lg', 'xl')).toBe(true)

		expect(same(html, 'sm', 'md')).toBe(false)
	})

	it('reads a stepped class of five values as one value for each step', () => {
		const html = '<div data-density="{step}" class="density-text-[xs,sm,base,lg,lg]"></div>'

		expect(same(html, 'xs', 'sm')).toBe(false)

		expect(same(html, 'lg', 'xl')).toBe(true)
	})

	it('reads a density variant at the step of its element', () => {
		const html =
			'<div data-density="{step}" class="density-[xs,sm]:w-2xs density-md:w-xs density-[lg,xl]:w-sm"></div>'

		expect(same(html, 'xs', 'sm')).toBe(true)

		expect(same(html, 'md', 'lg')).toBe(false)
	})

	it('reads a stepped class in a descendant of the scope', () => {
		const html = '<div data-density="{step}"><span class="density-p-[1,2,3,4,5]"></span></div>'

		expect(same(html, 'xs', 'sm')).toBe(false)
	})

	it('gives a control slot the step below its host', () => {
		// The slot takes `md` under `lg`, and `lg` under `xl`.
		const html =
			'<div data-density="{step}"><span data-density="slot" class="density-size-[3,4,5]"></span></div>'

		expect(same(html, 'lg', 'xl')).toBe(false)

		// The slot takes `xs` under `xs` and under `sm`.
		expect(same(html, 'xs', 'sm')).toBe(true)
	})

	it('reads a pseudo-element variant at the step of its own element, and not of a slot below it', () => {
		const html = [
			'<span data-density="{step}" class="density-[xs,sm]:before:rounded-ring-1.5 density-md:before:rounded-ring-2 density-[lg,xl]:before:rounded-ring-2.5">',
			'<span data-density="slot"></span>',
			'</span>',
		].join('')

		expect(same(html, 'lg', 'xl')).toBe(true)
	})

	it('reads a child variant at the step of each element in the subtree', () => {
		// The class styles the slot, which takes `md` under `lg` and `lg` under `xl`.
		const html = [
			'<span data-density="{step}" class="*:density-size-[3,4,5,6,6]">',
			'<span data-density="slot"></span>',
			'</span>',
		].join('')

		expect(same(html, 'lg', 'xl')).toBe(false)
	})

	it('reads an arbitrary variant before a combinator at the step of each element in the subtree', () => {
		const html = [
			'<span data-density="{step}" class="[&>*]:density-size-[3,4,5,6,6]">',
			'<span data-density="slot"></span>',
			'</span>',
		].join('')

		expect(same(html, 'lg', 'xl')).toBe(false)
	})

	it('compares the attributes, except the step, a `useId` value, and the label', () => {
		const at = (step: DensityStep, id: string, label: string) =>
			stepSignature(
				instance(
					`<div data-density="{step}" id="${id}" aria-label="${label} progress" data-variant="bar"></div>`,
					step,
				),
				step,
				label,
			)

		expect(at('xs', '_r_1_', 'Extra small')).toBe(at('sm', '_r_2_', 'Small'))

		expect(at('xs', '_r_1_', 'Extra small')).not.toBe(
			stepSignature(
				instance('<div data-density="{step}" data-variant="ring"></div>', 'sm'),
				'sm',
				'Small',
			),
		)
	})

	it('ignores the text and the caption of the instance', () => {
		const html = (label: string) =>
			`<span data-slot="axis-caption" class="text-xs">${label}</span><div data-density="{step}" class="density-h-[2,3,4]">${label}</div>`

		expect(stepSignature(instance(html('Extra small'), 'xs'), 'xs', 'Extra small')).toBe(
			stepSignature(instance(html('Small'), 'sm'), 'sm', 'Small'),
		)
	})

	it('returns null when no element opens a scope at the step', () => {
		expect(stepSignature(instance('<button class="h-8"></button>', 'sm'), 'sm', 'Small')).toBeNull()
	})
})
