'use client'

import { Pipette } from 'lucide-react'
import { useHydrated } from '../../hooks/use-hydrated'
import { Button } from '../button'
import { Icon } from '../icon'
import { hexToHsva } from './color-utilities'
import { useColorPanelContext } from './context'

type EyeDropperResult = { sRGBHex: string }
type EyeDropperConstructor = new () => { open: () => Promise<EyeDropperResult> }

/** @internal Resolve the platform `EyeDropper` constructor, or `undefined` where unsupported. Call it on the client only. */
function getEyeDropper(): EyeDropperConstructor | undefined {
	return (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper
}

/**
 * Samples a color from anywhere on screen via the `EyeDropper` API. Renders
 * nothing where the API is unavailable.
 *
 * @remarks
 * The server cannot read `window.EyeDropper`, so the server and the hydration
 * render draw no button ({@link useHydrated}). The button joins in the render
 * after hydration. A render that does not hydrate draws it in its first
 * commit. A dismissed picker rejects with `AbortError`, and the button ignores
 * it.
 */
export function ColorEyedropper({ className }: { className?: string }) {
	const { setHsva } = useColorPanelContext()

	const EyeDropper = useHydrated() ? getEyeDropper() : undefined

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
			className={className}
		>
			<Icon icon={<Pipette />} />
		</Button>
	)
}
