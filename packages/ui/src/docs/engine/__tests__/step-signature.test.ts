import { describe, expect, it } from 'vitest'
import type { DensityStep } from '../../../core/density'
import { formSignature, lookSignature, stepSignature } from '../step-signature'

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
	const first = stepSignature(instance(html, a), 'A')

	const second = stepSignature(instance(html, b), 'B')

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
		// The slot takes `sm` under `md`, and `md` under `lg`.
		const html =
			'<div data-density="{step}"><span data-density="slot" class="density-size-[3,4,5]"></span></div>'

		expect(same(html, 'md', 'lg')).toBe(false)

		// The host stops at `lg`, so the slot takes `md` under `lg` and under `xl`.
		expect(same(html, 'lg', 'xl')).toBe(true)

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
		// The class styles the slot, which takes `sm` under `md` and `md` under `lg`.
		const html = [
			'<span data-density="{step}" class="*:density-size-[3,4,5,6,6]">',
			'<span data-density="slot"></span>',
			'</span>',
		].join('')

		expect(same(html, 'md', 'lg')).toBe(false)
	})

	it('reads an arbitrary variant before a combinator at the step of each element in the subtree', () => {
		const html = [
			'<span data-density="{step}" class="[&>*]:density-size-[3,4,5,6,6]">',
			'<span data-density="slot"></span>',
			'</span>',
		].join('')

		expect(same(html, 'md', 'lg')).toBe(false)
	})

	it('compares the attributes, except the step, a `useId` value, and the label', () => {
		const at = (step: DensityStep, id: string, label: string) =>
			stepSignature(
				instance(
					`<div data-density="{step}" id="${id}" aria-label="${label} progress" data-variant="bar"></div>`,
					step,
				),
				label,
			)

		expect(at('xs', '_r_1_', 'Extra small')).toBe(at('sm', '_r_2_', 'Small'))

		expect(at('xs', '_r_1_', 'Extra small')).not.toBe(
			stepSignature(
				instance('<div data-density="{step}" data-variant="ring"></div>', 'sm'),
				'Small',
			),
		)
	})

	it('ignores the text and the caption of the instance', () => {
		const html = (label: string) =>
			`<span data-slot="axis-caption" class="text-xs">${label}</span><div data-density="{step}" class="density-h-[2,3,4]">${label}</div>`

		expect(stepSignature(instance(html('Extra small'), 'xs'), 'Extra small')).toBe(
			stepSignature(instance(html('Small'), 'sm'), 'Small'),
		)
	})

	it('matches an instance that opens its scope at another step', () => {
		// A Calendar at `xs` opens a scope at `sm`.
		const html = '<div data-density="sm" class="density-w-[52,68,80]"></div>'

		expect(stepSignature(instance(html, 'xs'), 'Extra small')).toBe(
			stepSignature(instance(html, 'sm'), 'Small'),
		)
	})

	it('returns null when no element opens a density scope', () => {
		expect(stepSignature(instance('<button class="h-8"></button>', 'sm'), 'Small')).toBeNull()

		// A control slot with no scope above it in the instance has no step either.
		expect(
			stepSignature(
				instance('<span data-density="slot" class="density-p-[1,2,3]"></span>', 'sm'),
				'Small',
			),
		).toBeNull()
	})
})

describe('formSignature', () => {
	/** Render one axis instance that holds `html`. */
	const wrap = (html: string) => {
		const wrapper = document.createElement('div')

		wrapper.innerHTML = html

		return wrapper
	}

	it('reads two instances alike when only the label and a useId value differ', () => {
		const a = formSignature(wrap('<button id="_r_1_" class="px-2">Red</button>'), 'Red')

		const b = formSignature(wrap('<button id="_r_2_" class="px-2">Blue</button>'), 'Blue')

		expect(a).toBe(b)
	})

	it('reads a class, an attribute, or a text as a difference', () => {
		const base = formSignature(wrap('<span class="a" data-x="1">one</span>'), 'L')

		expect(formSignature(wrap('<span class="b" data-x="1">one</span>'), 'L')).not.toBe(base)

		expect(formSignature(wrap('<span class="a" data-x="2">one</span>'), 'L')).not.toBe(base)

		expect(formSignature(wrap('<span class="a" data-x="1">two</span>'), 'L')).not.toBe(base)
	})
})

describe('lookSignature', () => {
	const wrap = (html: string) => {
		const wrapper = document.createElement('div')

		wrapper.innerHTML = html

		return wrapper
	}

	it('reads two headings alike when only the level differs', () => {
		const h2 = wrap('<h2 class="text-lg">Title</h2>')

		const h3 = wrap('<h3 class="text-lg">Title</h3>')

		expect(formSignature(h2, 'L')).not.toBe(formSignature(h3, 'L'))

		expect(lookSignature(h2, 'L')).toBe(lookSignature(h3, 'L'))
	})

	it('reads an unstyled ARIA attribute as no difference', () => {
		const one = wrap('<div role="listbox" class="grid" aria-multiselectable="false"></div>')

		const many = wrap('<div role="listbox" class="grid" aria-multiselectable="true"></div>')

		expect(formSignature(one, 'L')).not.toBe(formSignature(many, 'L'))

		expect(lookSignature(one, 'L')).toBe(lookSignature(many, 'L'))
	})

	it('reads an ARIA attribute that a class styles as a difference', () => {
		const styled = (value: string, variant: string) =>
			lookSignature(
				wrap(`<button class="${variant}:bg-blue-500" aria-pressed="${value}"></button>`),
				'L',
			)

		expect(styled('false', 'aria-pressed')).not.toBe(styled('true', 'aria-pressed'))

		expect(styled('false', 'group-aria-pressed')).not.toBe(styled('true', 'group-aria-pressed'))

		const sorted = (value: string) =>
			lookSignature(
				wrap(`<div class="aria-[sort=ascending]:underline" aria-sort="${value}"></div>`),
				'L',
			)

		expect(sorted('ascending')).not.toBe(sorted('descending'))
	})

	it('reads a class or another tag as a difference', () => {
		const base = lookSignature(wrap('<h2 class="text-lg">Title</h2>'), 'L')

		expect(lookSignature(wrap('<h3 class="text-xl">Title</h3>'), 'L')).not.toBe(base)

		expect(lookSignature(wrap('<div class="text-lg">Title</div>'), 'L')).not.toBe(base)
	})
})

describe('signatures and inline style', () => {
	it('ignore an inline style, which carries the state of a run such as a spring', () => {
		const at = (style: string) =>
			instance(`<div data-density="{step}" class="density-h-[2,3,4]" style="${style}"></div>`, 'xs')

		expect(stepSignature(at('width: 0%'), 'A')).toBe(stepSignature(at('width: 60%'), 'A'))

		const plain = (style: string) => {
			const wrapper = document.createElement('div')

			wrapper.innerHTML = `<span class="a" style="${style}"></span>`

			return wrapper
		}

		expect(formSignature(plain('width: 0%'), 'L')).toBe(formSignature(plain('width: 60%'), 'L'))
	})
})
