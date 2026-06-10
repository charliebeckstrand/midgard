import type { ReactNode } from 'react'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'

const labelText = 'text-xs text-zinc-500 dark:text-zinc-400'

/**
 * Horizontal showcase row used inside demos: a fixed-width text label next to
 * the component being demonstrated. The wrapper is transparent to the docs
 * code-derivation walker; derived snippets show only `children`.
 */
export function LabeledRow({
	label,
	labelWidth = 'sm',
	children,
}: {
	label: ReactNode
	labelWidth?: 'sm' | 'md' | 'lg'
	children: ReactNode
}) {
	return (
		<Flex gap="md">
			<span className={`${labelWidthClass[labelWidth]} ${labelText}`}>{label}</span>
			{children}
		</Flex>
	)
}

/**
 * Vertical showcase cell: the component above, a small caption beneath.
 * Like {@link LabeledRow}, the wrapper is transparent to the code walker.
 */
export function LabeledColumn({ label, children }: { label: ReactNode; children: ReactNode }) {
	return (
		<Stack gap="sm" align="center">
			{children}
			<span className={labelText}>{label}</span>
		</Stack>
	)
}

const labelWidthClass = {
	sm: 'w-8',
	md: 'w-10',
	lg: 'w-12',
} as const
