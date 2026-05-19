import { Search } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { hasLabelContent, isIconElement } from '../../components/button/button-utilities'
import { Icon } from '../../components/icon'

describe('isIconElement', () => {
	it('returns true for an <Icon> element', () => {
		expect(isIconElement(<Icon icon={<Search />} />)).toBe(true)
	})

	it('returns true for a raw <svg> element', () => {
		expect(isIconElement(<svg aria-hidden />)).toBe(true)
	})

	it('returns true for an element opted in via data-slot="icon"', () => {
		expect(isIconElement(<span data-slot="icon" />)).toBe(true)
	})

	it('returns false for an element without the icon marker', () => {
		expect(isIconElement(<span>label</span>)).toBe(false)
	})

	it('returns false for non-element values', () => {
		expect(isIconElement('text')).toBe(false)

		expect(isIconElement(42)).toBe(false)

		expect(isIconElement(null)).toBe(false)

		expect(isIconElement(undefined)).toBe(false)
	})
})

describe('hasLabelContent', () => {
	it('returns true for non-empty string children', () => {
		expect(hasLabelContent('Save')).toBe(true)
	})

	it('returns false for an empty string', () => {
		expect(hasLabelContent('')).toBe(false)
	})

	it('returns false for a whitespace-only string', () => {
		expect(hasLabelContent('   ')).toBe(false)
	})

	it('returns true for a number child, including zero', () => {
		expect(hasLabelContent(0)).toBe(true)
	})

	it('returns false when the only child is an <Icon>', () => {
		expect(hasLabelContent(<Icon icon={<Search />} />)).toBe(false)
	})

	it('returns false when the only child is a raw <svg>', () => {
		expect(hasLabelContent(<svg aria-hidden />)).toBe(false)
	})

	it('returns false when the only child opts in via data-slot="icon"', () => {
		expect(hasLabelContent(<span data-slot="icon" />)).toBe(false)
	})

	it('returns true when icon and text children are mixed', () => {
		expect(hasLabelContent([<Icon icon={<Search />} key="i" />, 'Search'])).toBe(true)
	})

	it('returns false for nullish children', () => {
		expect(hasLabelContent(null)).toBe(false)

		expect(hasLabelContent(undefined)).toBe(false)
	})
})
