'use client'

import { Pipette } from 'lucide-react'
import { useHydrated } from '../../hooks/use-hydrated'
import { useIntl } from '../../primitives/intl/use-intl'
import { Button } from '../button'
import { Icon } from '../icon'
import { colorMessages } from './color-messages'
import { hexToHsva } from './color-utilities'
import { useColorPanelContext } from './context'

type EyeDropperResult = { sRGBHex: string }
type EyeDropperConstructor = new () => { open: () => Promise<EyeDropperResult> }

/** @internal Resolve the platform `EyeDropper` constructor, or `undefined` where unsupported. Call it on the client only. */
function getEyeDropper(): EyeDropperConstructor | undefined {
	return (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper
}

/**
 * Samples a color from anywhere on screen via the `EyeDropper` API. The button
 * is disabled where the API is unavailable.
 *
 * @remarks
 * The server cannot read `window.EyeDropper`, so the server and the hydration
 * render draw the button enabled ({@link useHydrated}). Thus the button holds
 * its place in the first paint, and the row of the panel does not move at
 * hydration in any browser. Where the API does not exist, the render after
 * hydration disables the button. A render that does not hydrate reads the API
 * in its first commit. A dismissed picker rejects with `AbortError`, and the
 * button ignores it.
 *
 * @internal
 */
export function ColorEyedropper({ className }: { className?: string }) {
	const intl = useIntl()

	const { setHsva } = useColorPanelContext()

	// Until hydration, the API is unknown, and the button stays enabled.
	const supported = !useHydrated() || getEyeDropper() !== undefined

	const handlePick = async () => {
		const EyeDropper = getEyeDropper()

		if (!EyeDropper) return

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
			aria-label={intl.formatMessage(colorMessages.eyedropper)}
			disabled={!supported}
			onClick={handlePick}
			className={className}
		>
			<Icon icon={<Pipette />} />
		</Button>
	)
}
