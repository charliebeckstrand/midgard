import type { ReactNode } from 'react'
import { cn } from 'ui/core'
import { Flex } from 'ui/flex'
import { useScrollRegion } from 'ui/hooks'
import { omote } from '../../recipes/kiso/index.ts'

/**
 * A row of controls that stays on one line, and scrolls when the controls do
 * not fit. While it overflows, the edge with more controls behind it fades,
 * and the row is a tab stop with the name `label`.
 */
export function Rail({ label, children }: { label: string; children: ReactNode }) {
	const regionRef = useScrollRegion({ label })

	return (
		<Flex ref={regionRef} gap="sm" className={cn('max-w-full whitespace-nowrap', omote.rail)}>
			{children}
		</Flex>
	)
}
