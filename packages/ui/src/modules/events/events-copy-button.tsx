'use client'

import { Button } from '../../components/button'
import { useCopyButtonState } from '../../components/copy-button'

/**
 * A button with the text label "Copy" that copies `text`, with the copied
 * state of `CopyButton`.
 *
 * @internal
 */
export function EventsCopyButton({ text }: { text: string }) {
	const { copied, copy } = useCopyButtonState({ text })

	return (
		<Button size="sm" color={copied ? 'green' : undefined} onClick={() => void copy()}>
			{copied ? 'Copied' : 'Copy'}
		</Button>
	)
}
