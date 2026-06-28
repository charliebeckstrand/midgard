import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'

describe('useA11yDisclosure', () => {
	it('wires the trigger and panel to reference each other', () => {
		const { result } = renderHook(() => useA11yDisclosure())

		const { triggerId, panelId, triggerProps, panelProps } = result.current

		expect(triggerProps.id).toBe(triggerId)

		expect(triggerProps['aria-controls']).toBe(panelId)

		expect(panelProps.id).toBe(panelId)

		expect(panelProps['aria-labelledby']).toBe(triggerId)
	})

	it('omits aria-expanded unless an expanded state is supplied', () => {
		const { result, rerender } = renderHook(
			({ expanded }: { expanded?: boolean }) => useA11yDisclosure({ expanded }),
			{ initialProps: {} as { expanded?: boolean } },
		)

		expect(result.current.triggerProps).not.toHaveProperty('aria-expanded')

		rerender({ expanded: false })

		expect(result.current.triggerProps['aria-expanded']).toBe(false)

		rerender({ expanded: true })

		expect(result.current.triggerProps['aria-expanded']).toBe(true)
	})

	it('derives matching ids in independent calls sharing a base id and key', () => {
		const trigger = renderHook(() => useA11yDisclosure({ id: 'flow', key: 2 }))

		const panel = renderHook(() => useA11yDisclosure({ id: 'flow', key: 2 }))

		expect(trigger.result.current.triggerId).toBe('flow-trigger-2')

		expect(panel.result.current.panelId).toBe('flow-panel-2')

		// Both halves agree on the cross-reference.
		expect(panel.result.current.panelProps['aria-labelledby']).toBe(
			trigger.result.current.triggerProps.id,
		)

		expect(trigger.result.current.triggerProps['aria-controls']).toBe(
			panel.result.current.panelProps.id,
		)
	})

	it('discriminates pairs by key under a shared base id', () => {
		const { result: first } = renderHook(() => useA11yDisclosure({ id: 'flow', key: 1 }))

		const { result: second } = renderHook(() => useA11yDisclosure({ id: 'flow', key: 2 }))

		expect(first.current.triggerId).not.toBe(second.current.triggerId)

		expect(first.current.panelId).not.toBe(second.current.panelId)
	})

	it('keeps the prop bags referentially stable across re-renders', () => {
		const { result, rerender } = renderHook(() => useA11yDisclosure({ id: 'flow', expanded: true }))

		const firstTrigger = result.current.triggerProps

		const firstPanel = result.current.panelProps

		rerender()

		expect(result.current.triggerProps).toBe(firstTrigger)

		expect(result.current.panelProps).toBe(firstPanel)
	})
})
