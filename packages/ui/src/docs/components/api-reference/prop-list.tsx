'use client'

import { Info } from 'lucide-react'
import { Badge } from '../../../components/badge'
import { Button } from '../../../components/button'
import { CodeBlock } from '../../../components/code'
import { Flex } from '../../../components/flex'
import { Icon } from '../../../components/icon'
import { Markdown } from '../../../components/markdown'
import { Stack } from '../../../components/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { cn } from '../../../core'
import type { PropDef } from '../../api-reference/types'
import { TypeCell } from './type-cell'

/**
 * Prop entries. Each row leads with the prop name, an optional info button whose
 * tooltip carries the prose summary, then the required / default / deprecated
 * badges, then the technical metadata (type via `TypeCell`, `@example`). The
 * info button and meta are omitted when absent, so undocumented props collapse
 * to name + type.
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
				{prop.description && (
					<Tooltip>
						<TooltipTrigger>
							<Button variant="bare" size="sm" aria-label={`${prop.name} description`}>
								<Icon icon={<Info />} />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<Markdown>{prop.description}</Markdown>
						</TooltipContent>
					</Tooltip>
				)}
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
			<Flex align="center" gap="md" wrap className="text-sm">
				<TypeCell prop={prop} />
			</Flex>
			{prop.example && <CodeBlock code={prop.example} />}
		</Stack>
	)
}
