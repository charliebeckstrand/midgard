import { Badge } from 'ui/badge'
import { cn } from 'ui/core'
import { Heading } from 'ui/heading'
import { Markdown } from 'ui/markdown'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import type { ComponentApi, PropApi } from '../plugin/api.ts'

const EVENT = /^on[A-Z]/

const CHIP = 'rounded px-1.5 py-0.5 font-mono text-[0.8125rem]/5'

const OPTION = cn(
	CHIP,
	'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
)

const TYPE = cn(CHIP, 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300')

// The color of a default by the kind of its literal, as the JSON tree of `ui`
// colors a value.
const KINDS: readonly [RegExp, string][] = [
	[/^['"`]/, 'text-emerald-700 dark:text-emerald-400'],
	[/^-?\d/, 'text-amber-700 dark:text-amber-400'],
	[/^(?:true|false)$/, 'text-violet-600 dark:text-violet-400'],
	[/^(?:null|undefined)$/, 'text-mist-600 dark:text-mist-400'],
	[/^\[/, 'text-sky-600 dark:text-sky-400'],
	[/^\{/, 'text-rose-600 dark:text-rose-400'],
]

/** Whether a default is a sentence, such as "An empty set.", and not a value. */
function isSentence(text: string): boolean {
	return text.endsWith('.')
}

function byName(a: PropApi, b: PropApi): number {
	return a.name.localeCompare(b.name)
}

/** What a prop takes: a chip for each literal of a union, or one chip for its type, and the default. */
function PropFacts({ prop }: { prop: PropApi }) {
	const options = prop.values?.some((value) => typeof value !== 'boolean') ? prop.values : undefined

	const type = options ? undefined : (prop.type ?? 'boolean')

	const fallback = prop.default && !isSentence(prop.default) ? prop.default : undefined

	const kind = fallback && KINDS.find(([pattern]) => pattern.test(fallback))?.[1]

	return (
		<div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
			<span className="flex flex-wrap items-baseline gap-1.5">
				{options?.map((option) => (
					<code key={String(option)} className={OPTION}>
						{typeof option === 'string' ? `'${option}'` : String(option)}
					</code>
				))}
				{type && <code className={TYPE}>{type}</code>}
			</span>
			{fallback && (
				<span className="text-zinc-500 dark:text-zinc-400">
					default <code className={cn('font-mono', kind)}>{fallback}</code>
				</span>
			)}
		</div>
	)
}

/**
 * One prop, as the React docs write one: the name, "required" when the prop
 * is required, what it takes, and the description. A default that is a
 * sentence goes at the end of the description.
 */
function PropRow({ prop }: { prop: PropApi }) {
	const sentence = prop.default && isSentence(prop.default) ? `Default: ${prop.default}` : undefined

	const description = [prop.description, sentence].filter(Boolean).join('\n\n')

	return (
		<Stack gap="sm" className="py-5 first:pt-0 last:pb-0">
			<span className="flex flex-wrap items-baseline gap-x-2">
				<span
					className={cn(
						'font-mono font-medium text-zinc-900 dark:text-white',
						prop.deprecated !== undefined && 'line-through decoration-zinc-400',
					)}
				>
					{prop.name}
				</span>
				{prop.required && <span className="text-red-600 text-sm dark:text-red-500">required</span>}
				{prop.deprecated !== undefined && (
					<Tooltip>
						<TooltipTrigger>
							<Badge color="red" variant="soft" size="sm">
								deprecated
							</Badge>
						</TooltipTrigger>
						{prop.deprecated && <TooltipContent>{prop.deprecated}</TooltipContent>}
					</Tooltip>
				)}
			</span>
			<PropFacts prop={prop} />
			{description && <Markdown>{description}</Markdown>}
		</Stack>
	)
}

function PropSection({ title, props }: { title: string; props: readonly PropApi[] }) {
	if (props.length === 0) return null

	return (
		<div className="space-y-4">
			<Heading level={3}>{title}</Heading>
			<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
				{props.map((prop) => (
					<PropRow key={prop.name} prop={prop} />
				))}
			</div>
		</div>
	)
}

/** The tags whose HTML attributes the component also takes. */
function ElementsNote({ elements }: { elements: readonly string[] }) {
	if (elements.length === 0) return null

	const tags = elements.filter(Boolean)

	if (tags.length === 0) return <Text tone="muted">Also accepts all HTML attributes.</Text>

	return (
		<Text tone="muted">
			Also accepts all{' '}
			{tags.map((tag, index) => (
				<span key={tag}>
					{index > 0 && ', '}
					<code>{`<${tag}>`}</code>
				</span>
			))}{' '}
			HTML attributes.
		</Text>
	)
}

/** The description, the props, the events, and the HTML attributes of one component. */
export function ApiEntry({ component }: { component: ComponentApi }) {
	const props = component.props.filter((prop) => !EVENT.test(prop.name)).toSorted(byName)

	const events = component.props.filter((prop) => EVENT.test(prop.name)).toSorted(byName)

	return (
		<div className="space-y-4">
			{component.description && <Markdown>{component.description}</Markdown>}
			{component.props.length > 0 ? (
				<div className="space-y-6">
					<PropSection title="Props" props={props} />
					<PropSection title="Events" props={events} />
				</div>
			) : (
				<Text tone="muted">This component accepts no explicit props.</Text>
			)}
			<ElementsNote elements={component.elements ?? []} />
		</div>
	)
}
