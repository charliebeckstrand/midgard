'use client'

import { Share2 } from 'lucide-react'
import { CopyButton } from 'ui/copy-button'

/**
 * Copies the address of the page, which holds the seed of the run. A reader
 * who opens the address plays the same numbers. The button reads the address
 * at each copy, because a Reset writes a new one.
 */
export function ShareButton() {
	return (
		<CopyButton
			text={() => window.location.href}
			icon={<Share2 />}
			aria-label="Copy the link of this run"
		/>
	)
}
