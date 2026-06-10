'use client'

import { Pipette } from 'lucide-react'
import { useEffect, useState } from 'react'
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
 * nothing where the API is unavailable.
 */
export function ColorEyedropper({ className }: { className?: string }) {
	const { setHsva, disabled, size } = useColorPanelContext()

	// Probe for the API after mount. Reading it during render returns undefined
	// on the server but the constructor on a supporting client, mismatching
	// hydration.
	const [EyeDropper, setEyeDropper] = useState<EyeDropperConstructor>()

	useEffect(() => {
		setEyeDropper(() => getEyeDropper())
	}, [])

	if (!EyeDropper) return null

	const onPick = async () => {
		try {
			const { sRGBHex } = await new EyeDropper().open()

			const parsed = hexToHsva(sRGBHex)

			if (parsed) setHsva(parsed)
		} catch {
			// The user dismissed the eyedropper (AbortError); nothing to commit.
		}
	}

	return (
		<Button
			type="button"
			variant="bare"
			size={size}
			disabled={disabled}
			data-slot="color-eyedropper"
			aria-label="Pick color from screen"
			onClick={onPick}
			className={className}
		>
			<Icon icon={<Pipette />} />
		</Button>
	)
}
