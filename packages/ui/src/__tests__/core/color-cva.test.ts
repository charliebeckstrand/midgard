import { describe, expect, it } from 'vitest'
import { colorCva, colorKeys, compoundColors } from '../../core/color-cva'

describe('colorCva', () => {
	const tokens = {
		zinc: 'text-zinc-500',
		red: 'text-red-500',
	} as const

	it('applies base classes', () => {
		const cva = colorCva('font-bold', tokens)

		const result = cva({ color: 'zinc' })

		expect(result).toContain('font-bold')
	})

	it('defaults to zinc when no color provided', () => {
		const cva = colorCva('base', tokens)

		const result = cva()

		expect(result).toContain('text-zinc-500')
	})

	it('applies the correct color variant', () => {
		const cva = colorCva('base', tokens)

		const result = cva({ color: 'red' })

		expect(result).toContain('text-red-500')
		expect(result).not.toContain('text-zinc-500')
	})
})

describe('colorKeys', () => {
	it('returns object with empty string values for each key', () => {
		const tokens = { zinc: 'text-zinc', red: 'text-red', blue: 'text-blue' }

		const result = colorKeys(tokens)

		expect(result).toEqual({ zinc: '', red: '', blue: '' })
	})
})

describe('compoundColors', () => {
	it('with single variant returns correct entries', () => {
		const tokens = {
			zinc: 'bg-zinc-100',
			red: 'bg-red-100',
		}

		const result = compoundColors('solid', tokens)

		expect(result).toEqual([
			{ variant: 'solid', color: 'zinc', className: 'bg-zinc-100' },
			{ variant: 'solid', color: 'red', className: 'bg-red-100' },
		])
	})

	it('with mapping record returns flattened entries', () => {
		const mapping = {
			solid: { zinc: 'bg-zinc', red: 'bg-red' },
			outline: { zinc: 'border-zinc', red: 'border-red' },
		}

		const result = compoundColors(mapping)

		expect(result).toEqual([
			{ variant: 'solid', color: 'zinc', className: 'bg-zinc' },
			{ variant: 'solid', color: 'red', className: 'bg-red' },
			{ variant: 'outline', color: 'zinc', className: 'border-zinc' },
			{ variant: 'outline', color: 'red', className: 'border-red' },
		])
	})
})
