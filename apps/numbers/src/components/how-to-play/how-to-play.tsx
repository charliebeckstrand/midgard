'use client'

import { QuestionMark } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { useIntentLoad } from 'ui/hooks'
import { Icon } from 'ui/icon'

/**
 * Loads the module of the dialog, which carries the dialog and the accordion
 * code of ui. The page loads it in idle time after the hydration. Thus a run
 * page does not load that code before it hydrates, and the first open does not
 * wait for it.
 */
const loadDialog = () => import('./how-to-play-dialog')

/**
 * The question mark button of the header, which opens the "How to play"
 * dialog (`HowToPlayDialog`).
 *
 * @remarks The dialog loads in idle time after the hydration, and then renders
 * closed, so the first open is the same as a later open. A pointer on the
 * button or a focus on it starts the load sooner. A press before the load
 * opens the dialog when the module arrives.
 */
export function HowToPlay() {
	const [open, setOpen] = useState(false)

	const { module: dialog, request, preload } = useIntentLoad(loadDialog)

	return (
		<>
			<Button
				variant="plain"
				aria-label="How to play"
				onPointerEnter={preload}
				onPointerDown={preload}
				onFocus={preload}
				onClick={() => request(() => setOpen(true))}
			>
				<Icon icon={<QuestionMark />} />
			</Button>

			{dialog && <dialog.HowToPlayDialog open={open} onOpenChange={setOpen} />}
		</>
	)
}
