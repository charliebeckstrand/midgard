import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useIsRtl } from '../../hooks/use-is-rtl'
import { attach } from '../helpers'

/**
 * The read of the direction. The shared observer and the update on a `dir`
 * change are asserted in `browser/shared-observers.test.tsx`. These cases hold
 * the read to the `dir` attribute, so a render does not make the browser
 * compute the style of the page.
 */

/** A `span` in a `div` that carries `dir`. */
function buildInDir(dir: string) {
	const host = attach(document.createElement('div'))

	host.setAttribute('dir', dir)

	return host.appendChild(document.createElement('span'))
}

describe('useIsRtl', () => {
	it('reads the nearest dir attribute, with no style read', () => {
		const style = vi.spyOn(window, 'getComputedStyle')

		expect(renderHook(() => useIsRtl(buildInDir('rtl'))).result.current).toBe(true)

		expect(renderHook(() => useIsRtl(buildInDir('LTR'))).result.current).toBe(false)

		expect(style).not.toHaveBeenCalled()
	})

	it('skips a dir attribute with no valid value', () => {
		const inner = buildInDir('rtl').appendChild(document.createElement('b'))

		inner.setAttribute('dir', 'sideways')

		expect(renderHook(() => useIsRtl(inner)).result.current).toBe(true)
	})

	it('reads the computed style for dir="auto", which the text decides', () => {
		const style = vi.spyOn(window, 'getComputedStyle')

		renderHook(() => useIsRtl(buildInDir('auto')))

		expect(style).toHaveBeenCalled()
	})
})
