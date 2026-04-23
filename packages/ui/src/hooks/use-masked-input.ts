'use client'

import type { ChangeEvent } from 'react'
import { useControllable } from './use-controllable'

export type UseMaskedInputOptions = {
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
	format: (raw: string) => string
}

export type UseMaskedInputReturn = {
	value: string
	setValue: (raw: string) => void
	onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Controlled/uncontrolled string state for masked text inputs. Applies `format`
 * to the seed and to every subsequent change, returning props ready to spread
 * onto an `Input`.
 */
export function useMaskedInput({
	value,
	defaultValue,
	onChange,
	format,
}: UseMaskedInputOptions): UseMaskedInputReturn {
	const [current, setCurrent] = useControllable<string>({
		value,
		defaultValue: defaultValue !== undefined ? format(defaultValue) : '',
		onChange: onChange ? (v) => onChange(v ?? '') : undefined,
	})

	return {
		value: current ?? '',
		setValue: (raw) => setCurrent(format(raw)),
		onChange: (event) => setCurrent(format(event.target.value)),
	}
}
