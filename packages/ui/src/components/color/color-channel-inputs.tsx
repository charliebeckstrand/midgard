'use client'

import type { ChangeEvent } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { k } from '../../recipes/kata/color-panel'
import { clamp } from '../../utilities'
import { Input } from '../input'
import { hsvaToRgba, rgbaToHsva } from './color-utilities'
import { useColorPanelContext } from './context'
import { useColorField } from './use-color-field'

type Channel = 'r' | 'g' | 'b' | 'a'

const RGB: ReadonlyArray<'r' | 'g' | 'b'> = ['r', 'g', 'b']

/** Per-channel RGB(A) numeric entry, two-way bound to the panel's colour. */
export function ColorChannelInputs() {
	const { hsva, setHsva, alpha, disabled, size } = useColorPanelContext()

	const scope = useIdScope()

	const rgba = hsvaToRgba(hsva)

	// What each field shows at rest, derived from the live colour.
	const derived = {
		r: String(rgba.r),
		g: String(rgba.g),
		b: String(rgba.b),
		a: String(Math.round(hsva.a * 100)),
	} satisfies Record<Channel, string>

	const { draftProps, setDraft } = useColorField(derived)

	// Alpha enters as a 0–100 percentage and writes `hsva.a` directly; RGB
	// channels clamp to 0–255 and round-trip through rgba to recompute hue.
	const commit = (channel: Channel, raw: string) => {
		if (raw.trim() === '') return

		const n = Number(raw)

		if (Number.isNaN(n)) return

		if (channel === 'a') {
			setHsva((prev) => ({ ...prev, a: clamp(Math.round(n), 0, 100) / 100 }))

			return
		}

		setHsva(rgbaToHsva({ ...rgba, [channel]: clamp(Math.round(n), 0, 255) }))
	}

	const onChange = (channel: Channel) => (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value

		setDraft(channel, raw)

		commit(channel, raw)
	}

	const field = (channel: Channel) => (
		<div key={channel} className={k.field}>
			<label className={k.label} htmlFor={scope.sub(channel)}>
				{channel === 'a' ? 'A' : channel}
			</label>
			<Input
				{...draftProps(channel)}
				id={scope.sub(channel)}
				onChange={onChange(channel)}
				disabled={disabled}
				size={size}
				data-slot="color-channel-input"
				data-channel={channel}
				type="number"
				inputMode="numeric"
				min={0}
				max={channel === 'a' ? 100 : 255}
				aria-label={channel === 'a' ? 'Alpha channel' : `${channel.toUpperCase()} channel`}
				className="tabular-nums"
			/>
		</div>
	)

	return (
		<div className={cn('grid gap-2', alpha ? 'grid-cols-4' : 'grid-cols-3')}>
			{RGB.map((channel) => field(channel))}
			{alpha && field('a')}
		</div>
	)
}
