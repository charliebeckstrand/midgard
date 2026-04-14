'use client'

import { useCallback, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { Input } from '../input'
import { useInputEvents } from './use-input-events'
import { k } from './variants'

export type OtpInputProps = {
	/** Number of input cells. @default 6 */
	length?: number
	/** Cell size. @default 'md' */
	size?: 'sm' | 'md' | 'lg'
	value?: string
	defaultValue?: string
	/** Called when all cells are filled. */
	disabled?: boolean
	/** Marks all cells as invalid. */
	invalid?: boolean
	/** Marks all cells as valid. */
	valid?: boolean
	autoFocus?: boolean
	/** Restrict input to digits only. @default 'text' */
	type?: 'text' | 'number'
	className?: string
	onChange?: (value: string | undefined) => void
	onComplete?: (value: string) => void
}

export function OtpInput({
	onChange,
	onComplete,
	length = 6,
	size = 'md',
	value,
	defaultValue = '',
	disabled,
	invalid,
	valid,
	autoFocus,
	type = 'text',
	className,
}: OtpInputProps) {
	const [current, setCurrent] = useControllable({ value, defaultValue, onChange })

	const cellsRef = useRef<(HTMLInputElement | null)[]>([])

	const val = current ?? ''

	const focusCell = useCallback((i: number) => {
		cellsRef.current[i]?.focus()
	}, [])

	useEffect(() => {
		if (autoFocus) cellsRef.current[0]?.focus()
	}, [autoFocus])

	const commit = useCallback(
		(next: string) => {
			setCurrent(next)

			if (next.length === length) onComplete?.(next)
		},
		[length, onComplete, setCurrent],
	)

	const { handleChange, handleKeyDown, handlePaste } = useInputEvents({
		value: val,
		length,
		type,
		commit,
		focusCell,
	})

	return (
		<div data-slot="otp-input" className={cn(k.root, k.gap[size], className)}>
			{Array.from({ length }, (_, i) => {
				const cellKey = `cell-${i}`

				return (
					<div key={cellKey} className={cn(k.wrapper, k.size[size])}>
						<Input
							ref={(el) => {
								cellsRef.current[i] = el
							}}
							type="text"
							inputMode={type === 'number' ? 'numeric' : 'text'}
							pattern={type === 'number' ? '[0-9]' : undefined}
							maxLength={1}
							value={val[i] ?? ''}
							disabled={disabled}
							data-invalid={invalid || undefined}
							data-valid={valid || undefined}
							autoComplete={i === 0 ? 'one-time-code' : undefined}
							aria-label={`Digit ${i + 1} of ${length}`}
							className={k.cell}
							onChange={(e) => handleChange(i, e)}
							onKeyDown={(e) => handleKeyDown(i, e)}
							onPaste={handlePaste}
							onFocus={(e) => e.target.select()}
						/>
					</div>
				)
			})}
		</div>
	)
}
