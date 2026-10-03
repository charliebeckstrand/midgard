import { Badge } from '../../../../components/badge'
import { CodeBlock } from '../../../../components/code'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/tooltip'
import { cn } from '../../../../core'
import { Stack } from '../../../../structure/stack'
import type { PropDef } from '../../api-reference/types'
import { isProseDefault } from './default-value'
import { DocDescription } from './doc-description'
import { PropFacts } from './prop-facts'

/**
 * Prop entries, written the way the React docs write them. Each entry is the
 * name with a plain "optional" or "required" beside it, one sentence of facts via
 * `PropFacts`, then the description. The facts lead, so a long description never
 * buries the type, the options, or the default. A default that is a sentence joins the
 * description as its own line. Absent fields drop out, so an undocumented prop
 * collapses to its name and type.
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

	const proseDefault = prop.default && isProseDefault(prop.default) ? prop.default : undefined

	const description = [prop.description, proseDefault && `Default: ${proseDefault}`]
		.filter(Boolean)
		.join('\n\n')

	return (
		<Stack gap="sm" className="py-5 first:pt-0 last:pb-0">
			<span className="flex flex-wrap items-baseline gap-x-2">
				<span
					className={cn(
						'font-mono font-medium text-zinc-900 dark:text-white',
						deprecated && 'line-through decoration-zinc-400',
					)}
				>
					{prop.name}
				</span>
				<span
					className={cn(
						'text-sm',
						prop.required ? 'text-red-600 dark:text-red-500' : 'text-zinc-500 dark:text-zinc-400',
					)}
				>
					{prop.required ? 'required' : 'optional'}
				</span>
				{deprecated && (
					<Tooltip>
						<TooltipTrigger>
							<Badge color="red" variant="soft" size="sm">
								deprecated
							</Badge>
						</TooltipTrigger>
						{typeof deprecated === 'string' && <TooltipContent>{deprecated}</TooltipContent>}
					</Tooltip>
				)}
			</span>
			<PropFacts prop={prop} />
			<DocDescription description={description} />
			{prop.example && <CodeBlock code={prop.example} />}
		</Stack>
	)
}
