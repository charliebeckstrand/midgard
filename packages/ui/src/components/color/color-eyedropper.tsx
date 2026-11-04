'use client'

import { Pipette } from 'lucide-react'
import { useHydrated } from '../../hooks/use-hydrated'
import { InlineScript } from '../../primitives/inline-script/inline-script'
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

/** The rule that hides each eyedropper of the page. */
const HIDE_RULE = '[data-slot=color-eyedropper]{display:none}'

/** The attribute that marks the style of {@link HIDE_RULE}, so the page gets it one time. */
const HIDE_MARK = 'data-color-eyedropper'

/**
 * The pre-paint step of the server markup. Where the platform has no
 * `EyeDropper` API, it puts the style of {@link HIDE_RULE} in the head, one
 * time for each page. It changes no markup that React renders, so hydration
 * finds the markup of the server.
 */
const SCRIPT = `(function(){var h=document.head;if(window.EyeDropper||h.querySelector('style[${HIDE_MARK}]'))return;var e=document.createElement('style');e.setAttribute(${JSON.stringify(HIDE_MARK)},'');e.textContent=${JSON.stringify(HIDE_RULE)};h.appendChild(e)})()`

/**
 * Samples a color from anywhere on screen via the `EyeDropper` API. Renders
 * nothing where the API is unavailable.
 *
 * @remarks
 * The server cannot read `window.EyeDropper`, so the server and the hydration
 * render draw the button and the pre-paint step of {@link SCRIPT} after it
 * ({@link useHydrated}). Where the API exists, the first paint thus shows the
 * button, and the row of the panel does not move at hydration. Where the API
 * does not exist, the step hides the button before the first paint, and the
 * render after hydration removes it. A render that does not hydrate reads the
 * API in its first commit. A dismissed picker rejects with `AbortError`, and
 * the button ignores it.
 *
 * @internal
 */
export function ColorEyedropper({ className }: { className?: string }) {
	const intl = useIntl()

	const { setHsva } = useColorPanelContext()

	const hydrated = useHydrated()

	if (hydrated && !getEyeDropper()) return null

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
		<>
			<Button
				type="button"
				variant="bare"
				data-slot="color-eyedropper"
				aria-label={intl.formatMessage(colorMessages.eyedropper)}
				onClick={handlePick}
				className={className}
			>
				<Icon icon={<Pipette />} />
			</Button>

			{hydrated ? null : <InlineScript source={SCRIPT} />}
		</>
	)
}
