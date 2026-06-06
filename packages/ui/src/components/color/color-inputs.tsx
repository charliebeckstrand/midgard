'use client'

import { type ChangeEvent, useEffect, useState } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { k } from '../../recipes/kata/color-panel'
import { clamp } from '../../utilities'
import { Input } from '../input'
import { hexToHsva, hsvaToHex, hsvaToRgba, rgbaToHsva } from './color-utilities'
import { useColorPanelContext } from './context'

type Channel = 'r' | 'g' | 'b'

/** Hex and per-channel RGB(A) numeric entry, two-way bound to the panel's colour. */
export function ColorInputs() {
	const { hsva, setHsva, alpha, disabled, size } = useColorPanelContext()

	const scope = useIdScope()

	const canonicalHex = hsvaToHex(hsva, alpha).slice(1)

	// A local draft keeps partially-typed hex (e.g. while deleting) from being
	// rewritten under the cursor; it re-syncs from the colour only when the field
	// is not being edited.
	const [hexDraft, setHexDraft] = useState(canonicalHex)
	const [editing, setEditing] = useState(false)

	useEffect(() => {
		if (!editing) setHexDraft(canonicalHex)
	}, [canonicalHex, editing])

	const onHexChange = (event: ChangeEvent<HTMLInputElement>) => {
		const next = event.target.value

		setHexDraft(next)

		const parsed = hexToHsva(next)

		if (parsed) setHsva(alpha ? parsed : { ...parsed, a: 1 })
	}

	const rgba = hsvaToRgba(hsva)

	const onChannel = (channel: Channel) => (event: ChangeEvent<HTMLInputElement>) => {
		const n = clamp(Math.round(Number(event.target.value) || 0), 0, 255)

		setHsva(rgbaToHsva({ ...rgba, [channel]: n }))
	}

	const onAlpha = (event: ChangeEvent<HTMLInputElement>) => {
		const n = clamp(Math.round(Number(event.target.value) || 0), 0, 100)

		setHsva((prev) => ({ ...prev, a: n / 100 }))
	}

	const channels: Channel[] = ['r', 'g', 'b']

	return (
		<div data-slot="color-inputs" className={k.inputs}>
			<div className={k.field}>
				<label className={k.label} htmlFor={scope.sub('hex')}>
					Hex
				</label>
				<Input
					id={scope.sub('hex')}
					data-slot="color-hex-input"
					size={size}
					prefix="#"
					value={hexDraft}
					onChange={onHexChange}
					onFocus={() => setEditing(true)}
					onBlur={() => {
						setEditing(false)
						setHexDraft(canonicalHex)
					}}
					disabled={disabled}
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
							id={scope.sub(channel)}
							data-slot="color-channel-input"
							data-channel={channel}
							size={size}
							type="number"
							min={0}
							max={255}
							value={Math.round(rgba[channel])}
							onChange={onChannel(channel)}
							disabled={disabled}
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
							id={scope.sub('a')}
							data-slot="color-channel-input"
							data-channel="a"
							size={size}
							type="number"
							min={0}
							max={100}
							value={Math.round(hsva.a * 100)}
							onChange={onAlpha}
							disabled={disabled}
							aria-label="Alpha channel"
							className="tabular-nums"
						/>
					</div>
				)}
			</div>
		</div>
	)
}
