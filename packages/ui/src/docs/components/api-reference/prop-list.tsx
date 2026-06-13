'use client'

import { Badge } from '../../../components/badge'
import { CodeBlock } from '../../../components/code'
import { Flex } from '../../../components/flex'
import { Markdown } from '../../../components/markdown'
import { Stack } from '../../../components/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { cn } from '../../../core'
import type { PropDef } from '../../api-reference/types'
import { TypeCell } from './type-cell'

/**
 * Description-first prop entries. Each row leads with the prop name and its
 * required / default / deprecated badges, then the prose summary, then the
 * technical metadata (type via `TypeCell`, `@example`). Descriptions and meta
 * are omitted when absent, so undocumented props collapse to name + type.
 */
export function PropList({ rows }: { rows: PropDef[] }) {
	return (
		<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
			{rows.map((prop) => (
				<PropRow key={prop.name} prop={prop} />
			))}
		</div>
	)
}

function PropRow({ prop }: { prop: PropDef }) {
	const { deprecated } = prop

	return (
		<Stack gap="sm" className="py-4 first:pt-0 last:pb-0">
			<Flex align="center" gap="sm" wrap>
				<span
					className={cn(
						'font-mono font-medium text-zinc-900 dark:text-white',
						deprecated && 'line-through decoration-zinc-400',
					)}
				>
					{prop.name}
				</span>
				{prop.required && (
					<Badge variant="soft" color="amber">
						required
					</Badge>
				)}
				{prop.default && (
					<Tooltip>
						<TooltipTrigger>
							<Badge variant="soft" color="zinc">
								{prop.default}
							</Badge>
						</TooltipTrigger>
						<TooltipContent>Default</TooltipContent>
					</Tooltip>
				)}
				{deprecated && (
					<Tooltip>
						<TooltipTrigger>
							<Badge variant="soft" color="red">
								deprecated
							</Badge>
						</TooltipTrigger>
						{typeof deprecated === 'string' && <TooltipContent>{deprecated}</TooltipContent>}
					</Tooltip>
				)}
			</Flex>
			{prop.description && <Markdown>{prop.description}</Markdown>}
			<Flex align="center" gap="md" wrap className="text-sm">
				<TypeCell prop={prop} />
			</Flex>
			{prop.example && <CodeBlock code={prop.example} />}
		</Stack>
	)
}
