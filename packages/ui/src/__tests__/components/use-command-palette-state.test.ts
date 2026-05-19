import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCommandPaletteState } from '../../components/command-palette/use-command-palette-state'

describe('useCommandPaletteState', () => {
	it('starts with an empty query and a stable listbox id', () => {
		const { result } = renderHook(() =>
			useCommandPaletteState({ open: false, onOpenChange: () => {} }),
		)

		expect(result.current.query).toBe('')

		expect(typeof result.current.listboxId).toBe('string')

		expect(result.current.listboxId.length).toBeGreaterThan(0)
	})

	it('updates the query when setQuery is called', () => {
		const { result } = renderHook(() =>
			useCommandPaletteState({ open: true, onOpenChange: () => {} }),
		)

		act(() => {
			result.current.setQuery('search term')
		})

		expect(result.current.query).toBe('search term')
	})

	it('resets the query when transitioning from open to closed', () => {
		const { result, rerender } = renderHook(
			({ open }) => useCommandPaletteState({ open, onOpenChange: () => {} }),
			{ initialProps: { open: true } },
		)

		act(() => {
			result.current.setQuery('search term')
		})

		expect(result.current.query).toBe('search term')

		rerender({ open: false })

		expect(result.current.query).toBe('')
	})

	it('calls onOpenChange(false) when close() is invoked', () => {
		const onOpenChange = vi.fn()

		const { result } = renderHook(() => useCommandPaletteState({ open: true, onOpenChange }))

		act(() => {
			result.current.close()
		})

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
