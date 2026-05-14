import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { type ControlContextValue, ControlProvider } from '../../components/control/context'
import { useControlFieldProps } from '../../components/control/use-control-field-props'

function withControl(value: ControlContextValue | undefined) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <ControlProvider value={value}>{children}</ControlProvider>
	}
}

describe('useControlFieldProps', () => {
	it('returns undefined for every field with no input or context', () => {
		const { result } = renderHook(() => useControlFieldProps())

		expect(result.current).toEqual({
			id: undefined,
			autoComplete: undefined,
			disabled: undefined,
			required: undefined,
			readOnly: undefined,
			invalid: undefined,
		})
	})

	it('falls back to Control context when explicit input is omitted', () => {
		const { result } = renderHook(() => useControlFieldProps(), {
			wrapper: withControl({
				id: 'ctl-id',
				autoComplete: 'email',
				disabled: true,
				required: true,
				readOnly: true,
				invalid: true,
			}),
		})

		expect(result.current).toEqual({
			id: 'ctl-id',
			autoComplete: 'email',
			disabled: true,
			required: true,
			readOnly: true,
			invalid: true,
		})
	})

	it('explicit input wins over Control context', () => {
		const { result } = renderHook(
			() =>
				useControlFieldProps({
					id: 'mine',
					autoComplete: 'name',
					disabled: false,
					required: false,
					readOnly: false,
				}),
			{
				wrapper: withControl({
					id: 'ctl-id',
					autoComplete: 'email',
					disabled: true,
					required: true,
					readOnly: true,
				}),
			},
		)

		expect(result.current.id).toBe('mine')
		expect(result.current.autoComplete).toBe('name')
		expect(result.current.disabled).toBe(false)
		expect(result.current.required).toBe(false)
		expect(result.current.readOnly).toBe(false)
	})

	it('resolves invalid from binding when Control has none', () => {
		const { result } = renderHook(() => useControlFieldProps({ binding: { invalid: true } }))

		expect(result.current.invalid).toBe(true)
	})

	it('OR-merges Control invalid with binding invalid', () => {
		const { result } = renderHook(() => useControlFieldProps({ binding: { invalid: false } }), {
			wrapper: withControl({ id: 'x', invalid: true }),
		})

		expect(result.current.invalid).toBe(true)
	})

	it('preserves undefined when neither Control nor binding mark invalid', () => {
		const { result } = renderHook(() => useControlFieldProps({ binding: {} }), {
			wrapper: withControl({ id: 'x' }),
		})

		expect(result.current.invalid).toBeUndefined()
	})
})
