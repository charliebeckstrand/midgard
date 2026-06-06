'use client'

import { type ChangeEvent, useState } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { k } from '../../recipes/kata/color-panel'
import { clamp } from '../../utilities'
import { Input } from '../input'
import { hexToHsva, hsvaToHex, hsvaToRgba, rgbaToHsva } from './color-utilities'
import { useColorPanelContext } from './context'

type Field = 'hex' | 'r' | 'g' | 'b' | 'a'

/** Hex and per-channel RGB(A) numeric entry, two-way bound to the panel's colour. */
export function ColorInputs() {
	const { hsva, setHsva, alpha, disabled, size } = useColorPanelContext()

	const scope = useIdScope()

	const rgba = hsvaToRgba(hsva)

	// What each field shows at rest, derived from the live colour.
	const derived: Record<Field, string> = {
		hex: hsvaToHex(hsva, alpha).slice(1),
		r: String(rgba.r),
		g: String(rgba.g),
		b: String(rgba.b),
		a: String(Math.round(hsva.a * 100)),
	}

	// While a field is focused its raw text lives here so partially-typed input
	// (an empty field mid-edit, a half-typed hex) isn't overwritten by the
	// derived value under the cursor. Only one field edits at a time.
	const [edit, setEdit] = useState<{ field: Field; value: string } | null>(null)

	const valueFor = (field: Field) => (edit?.field === field ? edit.value : derived[field])

	const commitChannel = (channel: 'r' | 'g' | 'b', raw: string) => {
		if (raw.trim() === '') return

		const n = Number(raw)

		if (Number.isNaN(n)) return

		setHsva(rgbaToHsva({ ...rgba, [channel]: clamp(Math.round(n), 0, 255) }))
	}

	const commitAlpha = (raw: string) => {
		if (raw.trim() === '') return

		const n = Number(raw)

		if (Number.isNaN(n)) return

		setHsva((prev) => ({ ...prev, a: clamp(Math.round(n), 0, 100) / 100 }))
	}

	const onChange = (field: Field) => (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value

		setEdit({ field, value: raw })

		if (field === 'hex') {
			const parsed = hexToHsva(raw)

			if (parsed) setHsva(alpha ? parsed : { ...parsed, a: 1 })
		} else if (field === 'a') {
			commitAlpha(raw)
		} else {
			commitChannel(field, raw)
		}
	}

	const channels: Array<'r' | 'g' | 'b'> = ['r', 'g', 'b']

	const fieldProps = (field: Field) => ({
		id: scope.sub(field),
		value: valueFor(field),
		onChange: onChange(field),
		onFocus: () => setEdit({ field, value: derived[field] }),
		onBlur: () => setEdit(null),
		disabled,
		size,
	})

	return (
		<div data-slot="color-inputs" className={k.inputs}>
			<div className={k.field}>
				<label className={k.label} htmlFor={scope.sub('hex')}>
					Hex
				</label>
				<Input
					{...fieldProps('hex')}
					data-slot="color-hex-input"
					prefix="#"
					spellCheck={false}
					autoComplete="off"
					className="font-mono uppercase"
				/>
			</div>

			<div className={cn('grid gap-2', alpha ? 'grid-cols-4' : 'grid-cols-3')}>
				{channels.map((channel) => (
					<div key={channel} className={k.field}>
						<label className={k.label} htmlFor={scope.sub(channel)}>
							{channel}
						</label>
						<Input
							{...fieldProps(channel)}
							data-slot="color-channel-input"
							data-channel={channel}
							type="number"
							inputMode="numeric"
							min={0}
							max={255}
							aria-label={`${channel.toUpperCase()} channel`}
							className="tabular-nums"
						/>
					</div>
				))}

				{alpha && (
					<div className={k.field}>
						<label className={k.label} htmlFor={scope.sub('a')}>
							A
						</label>
						<Input
							{...fieldProps('a')}
							data-slot="color-channel-input"
							data-channel="a"
							type="number"
							inputMode="numeric"
							min={0}
							max={100}
							aria-label="Alpha channel"
							className="tabular-nums"
						/>
					</div>
				)}
			</div>
		</div>
	)
}
