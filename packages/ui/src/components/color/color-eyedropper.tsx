'use client'

import { Pipette } from 'lucide-react'
import { Button } from '../button'
import { Icon } from '../icon'
import { hexToHsva } from './color-utilities'
import { useColorPanelContext } from './context'

type EyeDropperResult = { sRGBHex: string }
type EyeDropperConstructor = new () => { open: () => Promise<EyeDropperResult> }

function getEyeDropper(): EyeDropperConstructor | undefined {
	if (typeof window === 'undefined') return undefined

	return (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper
}

/**
 * Samples a colour from anywhere on screen via the `EyeDropper` API. Renders
 * nothing where the API is unavailable, so it stays a progressive enhancement.
 */
export function ColorEyedropper() {
	const { setHsva, alpha, disabled, size } = useColorPanelContext()

	const EyeDropper = getEyeDropper()

	if (!EyeDropper) return null

	const onPick = async () => {
		try {
			const { sRGBHex } = await new EyeDropper().open()

			const parsed = hexToHsva(sRGBHex)

			if (parsed) setHsva(alpha ? parsed : { ...parsed, a: 1 })
		} catch {
			// The user dismissed the eyedropper (AbortError) — nothing to commit.
		}
	}

	return (
		<Button
			type="button"
			variant="outline"
			size={size}
			disabled={disabled}
			data-slot="color-eyedropper"
			aria-label="Pick color from screen"
			onClick={onPick}
			className="shrink-0"
		>
			<Icon icon={<Pipette />} />
		</Button>
	)
}
