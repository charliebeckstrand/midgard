import type { KeyboardSensorProps, SensorDescriptor, SensorOptions } from '@dnd-kit/core'
import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useSortableSensors } from '../../hooks/use-sortable-sensors'
import { ReducedMotionContext } from '../../primitives/reduced-motion/context'
import { stubMatchMedia } from '../helpers'

/**
 * Starts the keyboard sensor of `sensors`, as dnd-kit does when a drag starts,
 * and gives the scroll behavior that its keyboard moves use. The sensor adds
 * its key listener in a timeout, so the timeout runs before the cancel. The
 * sensor then holds no listener and no dismiss layer. The setup gives back the
 * real timeout after the test.
 */
function startKeyboardDrag(sensors: SensorDescriptor<SensorOptions>[]): ScrollBehavior | undefined {
	const descriptor = sensors.at(-1)

	if (descriptor === undefined) throw new Error('No keyboard sensor')

	// The parts of the sensor that the helper reads. dnd-kit types them as private.
	const Sensor = descriptor.sensor as unknown as new (
		props: KeyboardSensorProps,
	) => { props: KeyboardSensorProps; handleCancel: (event: Event) => void }

	vi.useFakeTimers({ toFake: ['setTimeout'] })

	const sensor = new Sensor({
		active: 'item',
		activeNode: { node: { current: null } },
		event: new KeyboardEvent('keydown'),
		context: {},
		options: descriptor.options,
		onStart: vi.fn(),
		onMove: vi.fn(),
		onEnd: vi.fn(),
		onCancel: vi.fn(),
	} as unknown as KeyboardSensorProps)

	const { scrollBehavior } = sensor.props.options

	vi.runAllTimers()

	sensor.handleCancel(new KeyboardEvent('keydown'))

	return scrollBehavior
}

describe('useSortableSensors', () => {
	it('omits the keyboard sensor when keyboard is false', () => {
		const withKeyboard = renderHook(() => useSortableSensors({ keyboard: true })).result.current

		const withoutKeyboard = renderHook(() => useSortableSensors({ keyboard: false })).result.current

		expect(withoutKeyboard.length).toBe(withKeyboard.length - 1)
	})

	it('threads a custom keyboardCoordinateGetter into the keyboard sensor', () => {
		const keyboardCoordinateGetter = () => undefined

		const { result } = renderHook(() => useSortableSensors({ keyboardCoordinateGetter }))

		// The keyboard sensor trails the pointer sensor; its options carry the getter.
		const keyboardSensor = result.current.at(-1)

		expect(keyboardSensor?.options).toMatchObject({ coordinateGetter: keyboardCoordinateGetter })
	})

	it('scrolls a keyboard move into view smoothly by default', () => {
		const { result } = renderHook(() => useSortableSensors())

		expect(startKeyboardDrag(result.current)).toBe('smooth')
	})

	it('reads the platform preference for reduced motion when the drag starts', () => {
		const { result } = renderHook(() => useSortableSensors())

		const first = result.current

		stubMatchMedia((query) => query === '(prefers-reduced-motion: reduce)')

		expect(startKeyboardDrag(result.current)).toBe('auto')

		// The preference is not read in the render, so the array keeps its identity.
		expect(result.current).toBe(first)
	})

	it('scrolls a keyboard move into view at once under the Motion setting of the app', () => {
		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(ReducedMotionContext, { value: true }, children)

		const { result } = renderHook(() => useSortableSensors(), { wrapper })

		expect(startKeyboardDrag(result.current)).toBe('auto')
	})

	it('keeps the sensors array stable across renders with the keyboard sensor on', () => {
		const { result, rerender } = renderHook(() => useSortableSensors())

		const first = result.current

		rerender()

		expect(result.current).toBe(first)
	})

	it('rebuilds the sensors array when the keyboard coordinate getter changes', () => {
		const { result, rerender } = renderHook(
			({ getter }) => useSortableSensors({ keyboardCoordinateGetter: getter }),
			{ initialProps: { getter: () => undefined } },
		)

		const first = result.current

		rerender({ getter: () => undefined })

		expect(result.current).not.toBe(first)
	})
})
