'use client'

import { useCallback, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { katachi } from '../../recipes'

const k = katachi.otpInput

export type OtpInputProps = {
	/** Number of input cells. @default 6 */
	length?: number
	/** Cell size. @default 'md' */
	size?: 'sm' | 'md' | 'lg'
	value?: string
	defaultValue?: string
	onChange?: (value: string | undefined) => void
	/** Called when all cells are filled. */
	onComplete?: (value: string) => void
	disabled?: boolean
	/** Marks all cells as invalid. */
	invalid?: boolean
	autoFocus?: boolean
	/** Restrict input to digits only. @default 'text' */
	type?: 'text' | 'number'
	className?: string
}

export function OtpInput({
	length = 6,
	size = 'md',
	value,
	defaultValue = '',
	onChange,
	onComplete,
	disabled,
	invalid,
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

	const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
		const char = e.target.value.slice(-1)
		if (!char) return
		if (type === 'number' && !/^\d$/.test(char)) return

		let next: string
		if (i >= val.length) {
			next = val.padEnd(i, ' ') + char
		} else {
			next = val.substring(0, i) + char + val.substring(i + 1)
		}
		commit(next)
		if (i < length - 1) focusCell(i + 1)
	}

	const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
		switch (e.key) {
			case 'Backspace': {
				e.preventDefault()
				if (val[i]) {
					commit(val.substring(0, i) + val.substring(i + 1))
				} else if (i > 0) {
					commit(val.substring(0, i - 1) + val.substring(i))
					focusCell(i - 1)
				}
				break
			}
			case 'ArrowLeft':
				if (i > 0) {
					e.preventDefault()
					focusCell(i - 1)
				}
				break
			case 'ArrowRight':
				if (i < length - 1) {
					e.preventDefault()
					focusCell(i + 1)
				}
				break
		}
	}

	const handlePaste = (e: React.ClipboardEvent) => {
		e.preventDefault()
		const text = e.clipboardData.getData('text').slice(0, length)
		if (type === 'number' && !/^\d*$/.test(text)) return
		commit(text)
		focusCell(Math.min(text.length, length - 1))
	}

	return (
		<div data-slot="otp-input" className={cn(k.root, k.gap[size], className)}>
			{Array.from({ length }, (_, i) => {
				const cellKey = `cell-${i}`
				return (
					<input
						key={cellKey}
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
						autoComplete={i === 0 ? 'one-time-code' : undefined}
						aria-label={`Digit ${i + 1} of ${length}`}
						className={cn(k.cell, k.size[size])}
						onChange={(e) => handleChange(i, e)}
						onKeyDown={(e) => handleKeyDown(i, e)}
						onPaste={handlePaste}
						onFocus={(e) => e.target.select()}
					/>
				)
			})}
		</div>
	)
}
