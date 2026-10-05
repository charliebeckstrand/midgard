import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { GlassProvider, useResolvedSurface } from '../../providers/glass'
import { bySlot, renderUI } from '../helpers'

describe('GlassProvider', () => {
	it('renders with data-slot="glass"', () => {
		const { container } = renderUI(<GlassProvider>content</GlassProvider>)

		const el = bySlot(container, 'glass')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})
})

describe('useResolvedSurface', () => {
	const inGlass = ({ children }: { children: ReactNode }) => (
		<GlassProvider>{children}</GlassProvider>
	)

	it('follows the ambient flag when the prop is not set', () => {
		expect(renderHook(() => useResolvedSurface(undefined)).result.current).toBeUndefined()

		expect(
			renderHook(() => useResolvedSurface(undefined), { wrapper: inGlass }).result.current,
		).toBe('glass')
	})

	it('turns glass on outside a provider when the prop is true', () => {
		expect(renderHook(() => useResolvedSurface(true)).result.current).toBe('glass')
	})

	it('turns glass off inside a provider when the prop is false', () => {
		expect(
			renderHook(() => useResolvedSurface(false), { wrapper: inGlass }).result.current,
		).toBeUndefined()
	})
})
