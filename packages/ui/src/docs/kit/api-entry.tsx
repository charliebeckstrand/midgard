import { Badge } from 'ui/badge'
import { cn } from 'ui/core'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Markdown, primeMarkdown } from 'ui/markdown'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { MARKDOWN_CACHE_SIZE } from '../../components/markdown/markdown.tsx'
import { k } from '../../recipes/kata/json-tree.ts'
import type { BarrelApi, ComponentApi, PropApi } from '../plugin/api.ts'
import { runInSlices } from './idle.ts'

const CHIP = 'rounded px-1.5 py-0.5 font-mono text-[0.8125rem]/5'

const OPTION = cn(
	CHIP,
	'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
)

const TYPE = cn(CHIP, 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300')

// The color of a default by the kind of its literal: the colors of the JSON
// tree of `ui`, and two more for an array and an object.
const KINDS: readonly [RegExp, string | readonly string[]][] = [
	[/^['"`]/, k.color.string],
	[/^-?\d/, k.color.number],
	[/^(?:true|false)$/, k.color.boolean],
	[/^(?:null|undefined)$/, k.color.null],
	[/^\[/, 'text-sky-600 dark:text-sky-400'],
	[/^\{/, 'text-rose-600 dark:text-rose-400'],
]

/** What a prop takes: a chip for each literal of a union, or one chip for its type, and the default. */
function PropFacts({ prop }: { prop: PropApi }) {
	const options = prop.values?.some((value) => typeof value !== 'boolean') ? prop.values : undefined

	const type = options ? undefined : (prop.type ?? 'boolean')

	const fallback = prop.default

	const kind = fallback && KINDS.find(([pattern]) => pattern.test(fallback))?.[1]

	return (
		<Flex align="baseline" gap="lg" wrap className="text-sm">
			<Flex as="span" align="baseline" gap="sm" wrap>
				{options?.map((option) => (
					<code key={String(option)} className={OPTION}>
						{typeof option === 'string' ? `'${option}'` : String(option)}
					</code>
				))}
				{type && <code className={TYPE}>{type}</code>}
			</Flex>
			{fallback && (
				<span className="text-zinc-500 dark:text-zinc-400">
					default <code className={cn('font-mono', kind)}>{fallback}</code>
				</span>
			)}
		</Flex>
	)
}

/**
 * One prop, as the React docs write one: the name, "required" when the prop
 * is required, what it takes, and the description.
 */
function PropRow({ prop }: { prop: PropApi }) {
	return (
		<Stack gap="sm" className="py-5 first:pt-0 last:pb-0">
			<Flex as="span" align="baseline" gap="sm" wrap>
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
			</Flex>
			<PropFacts prop={prop} />
			{prop.description && <Markdown>{prop.description}</Markdown>}
		</Stack>
	)
}

function PropSection({ title, props }: { title: string; props: readonly PropApi[] }) {
	if (props.length === 0) return null

	return (
		<Stack gap="lg">
			<Heading level={4}>{title}</Heading>
			<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
				{props.map((prop) => (
					<PropRow key={prop.name} prop={prop} />
				))}
			</div>
		</Stack>
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
	return (
		<Stack gap="lg">
			{component.description && <Markdown>{component.description}</Markdown>}
			{component.props.length + component.events.length > 0 ? (
				<Stack gap="xl">
					<PropSection title="Props" props={component.props} />
					<PropSection title="Events" props={component.events} />
				</Stack>
			) : (
				<Text tone="muted">This component accepts no explicit props.</Text>
			)}
			<ElementsNote elements={component.elements ?? []} />
		</Stack>
	)
}

/**
 * Lexes the descriptions of `api` in idle time, in the order of the accordion,
 * so an entry renders its Markdown with no lex. The work stops when the token
 * cache is full, so it does not drop a source that it stored before.
 */
export function primeApi(api: BarrelApi, signal: AbortSignal): void {
	const sources = new Set<string>()

	for (const component of Object.values(api)) {
		for (const { description } of [component, ...component.props, ...component.events]) {
			if (description) sources.add(description)
		}
	}

	const next = [...sources].slice(0, MARKDOWN_CACHE_SIZE).values()

	runInSlices(() => {
		const source = next.next()

		if (source.done) return false

		primeMarkdown(source.value)

		return true
	}, signal)
}
