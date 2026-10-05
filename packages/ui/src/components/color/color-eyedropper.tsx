'use client'

import { Pipette } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../button'
import { Icon } from '../icon'
import { hexToHsva } from './color-utilities'
import { useColorPanelContext } from './context'

type EyeDropperResult = { sRGBHex: string }
type EyeDropperConstructor = new () => { open: () => Promise<EyeDropperResult> }

/** @internal Resolve the platform `EyeDropper` constructor, or `undefined` on the server or where unsupported. */
function getEyeDropper(): EyeDropperConstructor | undefined {
	if (typeof window === 'undefined') return undefined

	return (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper
}

/**
 * Samples a color from anywhere on screen via the `EyeDropper` API. Renders
 * nothing where the API is unavailable.
 *
 * @remarks
 * Support is probed in a post-mount effect rather than during render. Reading
 * `window.EyeDropper` on the server yields `undefined`, but yields the
 * constructor on a supporting client, so a render-time check would mismatch
 * hydration. The button is therefore absent on the first client paint and
 * appears once the effect commits. A dismissed picker rejects with
 * `AbortError`, which is swallowed.
 */
export function ColorEyedropper({ className }: { className?: string }) {
	const { setHsva } = useColorPanelContext()

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
			data-slot="color-eyedropper"
			aria-label="Pick color from screen"
			onClick={onPick}
			// The content wrapper of the popover cancels each mousedown, so a drag on
			// the area or a slider keeps focus (color-picker-content.tsx). Stop the
			// press here, so that it moves focus off an edited field and the blur
			// commit of the field runs before the pick. The stop does nothing in the
			// inline ColorPanel.
			onMouseDown={(event) => event.stopPropagation()}
			className={className}
		>
			<Icon icon={<Pipette />} />
		</Button>
	)
}
