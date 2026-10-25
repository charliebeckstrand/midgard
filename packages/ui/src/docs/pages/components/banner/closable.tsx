import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Banner } from 'ui/banner'
import { ResetButton } from '../../../kit/reset-button.tsx'

export default function Closable() {
	const [open, setOpen] = useState(true)

	const bannerRef = useRef<HTMLDivElement>(null)

	const resetRef = useRef<HTMLButtonElement>(null)

	// The Reset button leaves when the banner opens, so it gives the focus to the
	// close button of the banner.
	const reset = () => {
		flushSync(() => setOpen(true))

		bannerRef.current?.querySelector<HTMLElement>('[data-slot="alert-close"]')?.focus()
	}

	// The banner stays mounted, so that its close gives the focus to the Reset
	// button. The Reset button comes first, so that its ref is set when the
	// banner closes.
	return (
		<>
			{open ? null : <ResetButton ref={resetRef} onClick={reset} />}
			<Banner
				ref={bannerRef}
				severity="info"
				title="New version available"
				description="Version 2.4 is ready to install."
				open={open}
				onOpenChange={setOpen}
				returnFocusTo={resetRef}
			/>
		</>
	)
}
