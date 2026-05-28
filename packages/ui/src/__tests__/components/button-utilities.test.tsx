import { Search } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { isIconElement } from '../../components/button/button-utilities'
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
