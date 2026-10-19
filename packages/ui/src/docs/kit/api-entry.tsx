import { type ReactNode, useEffect } from 'react'
import { Badge } from 'ui/badge'
import { cn } from 'ui/core'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Link } from 'ui/link'
import { Markdown, primeMarkdown } from 'ui/markdown'
import { defineMessage, defineMessages, IntlMessage, useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { MARKDOWN_CACHE_SIZE } from '../../components/markdown/markdown.tsx'
import { k } from '../../recipes/kata/json-tree.ts'
import type { BarrelApi, ComponentApi, PropApi } from '../plugin/api.ts'
import { apiIdOf } from './anchors.ts'
import { runInSlices } from './idle.ts'
import { scrollToPending, usePendingAnchor } from './pending-anchor.ts'

const messages = defineMessages({
	props: {
		id: 'docs.api.props',
		defaultMessage: 'Props',
		description:
			'The heading of the list of the props of a component in the API reference. A prop is an input of the component.',
	},
	events: {
		id: 'docs.api.events',
		defaultMessage: 'Events',
		description:
			'The heading of the list of the event props of a component in the API reference, such as onChange.',
	},
	required: {
		id: 'docs.api.required',
		defaultMessage: 'required',
		description:
			'The word next to the name of a prop in the API reference when the component needs a value for the prop. Write it in lowercase.',
	},
	deprecated: {
		id: 'docs.api.deprecated',
		defaultMessage: 'deprecated',
		description:
			'The badge next to the name of a prop in the API reference when the prop is old and a later version removes it. Write it in lowercase.',
	},
	htmlAttributes: {
		id: 'docs.api.htmlAttributes',
		defaultMessage: 'Also takes the HTML attributes.',
		description:
			'The sentence at the end of the API reference of a component that also takes the attributes of its HTML element.',
	},
	noProps: {
		id: 'docs.api.noProps',
		defaultMessage: 'This component takes no props of its own.',
		description:
			'The text of the API reference of a component that has no props or events of its own.',
	},
})

// The default of a prop, with the code of the value, such as "default 'md'".
const defaultMessage = defineMessage<{ value: string }>({
	id: 'docs.api.default',
	defaultMessage: 'default {value}',
	description:
		'The default value of a prop in the API reference. The value is code, such as a string or a number. Write it in lowercase.',
})

// The HTML elements whose attributes a component also takes, such as "<div>, <span>".
const htmlAttributesOfMessage = defineMessage<{ tags: string }>({
	id: 'docs.api.htmlAttributesOf',
	defaultMessage: 'Also takes the HTML attributes of {tags}.',
	description:
		'The sentence at the end of the API reference of a component. The tags are the HTML elements of the component, as code, such as <div>.',
})

// A character that no message holds. It takes the place of a value in the text
// of a message. A split of the text then gives the text on each side of the value.
const SLOT = '\u0000'

/** The text of a message with `node` in the place of {@link SLOT}. */
function withNode(text: string, node: ReactNode): ReactNode {
	const [before = '', after = ''] = text.split(SLOT)

	return (
		<>
			{before}
			{node}
			{after}
		</>
	)
}

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

/**
 * What a prop takes: a chip for each literal of a union, or one chip for its
 * type, and the default. A responsive prop shows its type, which tells that it
 * takes a value for each breakpoint.
 */
function PropFacts({ prop }: { prop: PropApi }) {
	const intl = useIntl()

	const options =
		!prop.responsive && prop.values?.some((value) => typeof value !== 'boolean')
			? prop.values
			: undefined

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
					{withNode(
						intl.formatMessage(defaultMessage, { value: SLOT }),
						<code className={cn('font-mono', kind)}>{fallback}</code>,
					)}
				</span>
			)}
		</Flex>
	)
}

/**
 * One prop, as the React docs write one: the name, "required" when the prop
 * is required, what it takes, and the description. The name is a link to the
 * row, whose id is {@link apiIdOf} the component and the prop. The row scrolls
 * into view when it mounts as the pending anchor ({@link usePendingAnchor}).
 */
function PropRow({ component, prop }: { component: string; prop: PropApi }) {
	const id = apiIdOf(component, prop.name)

	const pending = usePendingAnchor()

	useEffect(() => {
		if (pending?.current?.id === id) scrollToPending(pending)
	}, [pending, id])

	return (
		<Stack id={id} gap="sm" className="py-5 first:pt-0 last:pb-0">
			<Flex as="span" align="baseline" gap="sm" wrap>
				<span
					className={cn(
						'font-mono font-medium text-zinc-900 dark:text-white',
						prop.deprecated !== undefined && 'line-through decoration-zinc-400',
					)}
				>
					<Link href={`#${id}`}>{prop.name}</Link>
				</span>
				{prop.required && (
					<span className="text-red-600 text-sm dark:text-red-500">
						<IntlMessage message={messages.required} />
					</span>
				)}
				{prop.deprecated !== undefined && (
					<Tooltip>
						<TooltipTrigger>
							<Badge color="red" variant="soft" size="sm">
								<IntlMessage message={messages.deprecated} />
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

function PropSection({
	title,
	component,
	props,
}: {
	title: ReactNode
	component: string
	props: readonly PropApi[]
}) {
	if (props.length === 0) return null

	return (
		<Stack gap="lg">
			<Heading level={4}>{title}</Heading>
			<div className="divide-y divide-zinc-200 dark:divide-zinc-800">
				{props.map((prop) => (
					<PropRow key={prop.name} component={component} prop={prop} />
				))}
			</div>
		</Stack>
	)
}

/** The tags whose HTML attributes the component also takes. */
function ElementsNote({ elements }: { elements: readonly string[] }) {
	const intl = useIntl()

	if (elements.length === 0) return null

	const tags = elements.filter(Boolean)

	if (tags.length === 0) {
		return (
			<Text tone="muted">
				<IntlMessage message={messages.htmlAttributes} />
			</Text>
		)
	}

	return (
		<Text tone="muted">
			{withNode(
				intl.formatMessage(htmlAttributesOfMessage, { tags: SLOT }),
				tags.map((tag, index) => (
					<span key={tag}>
						{index > 0 && ', '}
						<code>{`<${tag}>`}</code>
					</span>
				)),
			)}
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
					<PropSection
						title={<IntlMessage message={messages.props} />}
						component={component.name}
						props={component.props}
					/>
					<PropSection
						title={<IntlMessage message={messages.events} />}
						component={component.name}
						props={component.events}
					/>
				</Stack>
			) : (
				<Text tone="muted">
					<IntlMessage message={messages.noProps} />
				</Text>
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

	const queue = [...sources].slice(0, MARKDOWN_CACHE_SIZE).values()

	runInSlices(() => {
		const source = queue.next()

		if (source.done) return false

		primeMarkdown(source.value)

		return true
	}, signal)
}
