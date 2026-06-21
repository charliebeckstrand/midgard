import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ControlContext, type ControlContextValue } from '../../components/control/context'
import { useControlProps } from '../../components/control/use-control-props'

function withControl(value: ControlContextValue | undefined) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <ControlContext value={value}>{children}</ControlContext>
	}
}

describe('useControlProps', () => {
	it('returns undefined for every field with no input or context', () => {
		const { result } = renderHook(() => useControlProps())

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
		const { result } = renderHook(() => useControlProps(), {
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
			validation: { 'data-invalid': '', 'aria-invalid': true },
		})
	})

	it('explicit input wins over Control context', () => {
		const { result } = renderHook(
			() =>
				useControlProps({
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

	it('resolves invalid from the form-bound flag when Control has none', () => {
		const { result } = renderHook(() => useControlProps({ invalid: true }))

		expect(result.current.invalid).toBe(true)
	})

	it('OR-merges Control invalid with the form-bound flag', () => {
		const { result } = renderHook(() => useControlProps({ invalid: false }), {
			wrapper: withControl({ id: 'x', invalid: true }),
		})

		expect(result.current.invalid).toBe(true)
	})

	it('preserves undefined when neither Control nor the bound field mark invalid', () => {
		const { result } = renderHook(() => useControlProps({}), {
			wrapper: withControl({ id: 'x' }),
		})

		expect(result.current.invalid).toBeUndefined()
	})

	it('resolves severity="error" to invalid plus the invalid attribute pair', () => {
		const { result } = renderHook(() => useControlProps({}), {
			wrapper: withControl({ id: 'x', severity: 'error' }),
		})

		expect(result.current.invalid).toBe(true)
		expect(result.current.validation).toEqual({ 'data-invalid': '', 'aria-invalid': true })
	})

	it('resolves severity="warning" to data-warning without marking invalid', () => {
		const { result } = renderHook(() => useControlProps({}), {
			wrapper: withControl({ id: 'x', severity: 'warning' }),
		})

		expect(result.current.invalid).toBeUndefined()
		expect(result.current.validation).toEqual({ 'data-warning': '' })
	})

	it('resolves severity="success" to data-valid without marking invalid', () => {
		const { result } = renderHook(() => useControlProps({}), {
			wrapper: withControl({ id: 'x', severity: 'success' }),
		})

		expect(result.current.invalid).toBeUndefined()
		expect(result.current.validation).toEqual({ 'data-valid': '' })
	})

	it('lets invalid win over a warning severity', () => {
		const { result } = renderHook(() => useControlProps({ invalid: true }), {
			wrapper: withControl({ id: 'x', severity: 'warning' }),
		})

		expect(result.current.invalid).toBe(true)
		expect(result.current.validation).toEqual({ 'data-invalid': '', 'aria-invalid': true })
	})
})
