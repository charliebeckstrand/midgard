import {
	Blocks,
	Braces,
	GapHorizontal,
	Layers,
	LayoutTemplate,
	type LucideIcon,
	PanelTop,
	Shapes,
	SquareDashed,
} from 'lucide-react'
import {
	CommandPaletteDescription,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteText,
} from 'ui/command-palette'
import { Icon } from 'ui/icon'
import {
	defineMessage,
	defineMessages,
	type IntlShape,
	type MessageDescriptor,
	useIntl,
} from 'ui/primitives/intl'
import type { VirtualOptionMeta } from 'ui/primitives/virtual-options'
import type { Matchable } from '../engine/index.ts'
import type { SearchKind } from '../types.ts'
import { sectionByPath } from './localize.ts'

// One row of the results of the search: a tinted icon of the kind of the
// entry, its label, and one short line below it.

// The kind of each entry. A screen reader reads it before the line below the
// label, because the icon has no text.
const KIND_LABELS: Readonly<Record<SearchKind, MessageDescriptor>> = defineMessages({
	page: {
		id: 'docs.search.kind.page',
		defaultMessage: 'Page',
		description: 'The kind of a search result that is a page of the docs, such as Button.',
	},
	tab: {
		id: 'docs.search.kind.tab',
		defaultMessage: 'Tab',
		description:
			'The kind of a search result that is a tab of a page of the docs, such as Sorting.',
	},
	component: {
		id: 'docs.search.kind.component',
		defaultMessage: 'API reference',
		description:
			'The kind of a search result that is the API reference of a component: its props and its events.',
	},
})

const pageApiMessage = defineMessage<{ page: string }>({
	id: 'docs.search.page-api',
	defaultMessage: '{page} API reference',
	description:
		'The line below a search result that is the API reference of a component on a page with another name, such as "Fieldset API reference" for <Field />.',
})

/** The tint of the icon of each kind, in the light theme and the dark theme. */
const KIND_TINT: Readonly<Record<SearchKind, string>> = {
	page: 'bg-blue-500/12 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300',
	tab: 'bg-sky-500/12 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300',
	component: 'bg-violet-500/12 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300',
}

/** The icon of each kind other than a page. A page shows the icon of its section. */
const KIND_ICON: Readonly<Record<Exclude<SearchKind, 'page'>, LucideIcon>> = {
	tab: PanelTop,
	component: Braces,
}

/** The icon of each section of the docs, by its folder. */
const SECTION_ICON: Readonly<Record<string, LucideIcon>> = {
	components: Shapes,
	modules: Blocks,
	layouts: LayoutTemplate,
	structure: SquareDashed,
	primitives: GapHorizontal,
	providers: Layers,
}

/**
 * The tint of the icon of a page in a section with its own color. A page in
 * another section has the tint of its kind.
 */
const SECTION_TINT: Readonly<Record<string, string>> = {
	modules: 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300',
}

function getTint(option: Matchable): string {
	if (option.kind !== 'page') return KIND_TINT[option.kind]

	return SECTION_TINT[sectionByPath.get(option.href) ?? ''] ?? KIND_TINT.page
}

function getIcon(option: Matchable): LucideIcon {
	if (option.kind !== 'page') return KIND_ICON[option.kind]

	return SECTION_ICON[sectionByPath.get(option.href) ?? ''] ?? Shapes
}

/**
 * The line below the label: the section of a page, the page of a tab, and
 * "API reference" for a component. A
 * component on a page with another name, such as `<Field />` on the Fieldset
 * page, names the page.
 */
function formatSubtitle(intl: IntlShape, option: Matchable): string {
	if (option.kind !== 'component') return option.place ?? option.context

	const page = option.context.split(' › ')[0] ?? option.context

	return option.label.slice(1).startsWith(page)
		? intl.formatMessage(KIND_LABELS.component)
		: intl.formatMessage(pageApiMessage, { page })
}

/** The tinted icon of the kind of an entry, or of the section of a page. */
export function ResultIcon({ option }: { option: Matchable }) {
	return (
		<span
			aria-hidden
			className={`flex size-7 shrink-0 items-center justify-center rounded-md ${getTint(option)}`}
		>
			<Icon icon={getIcon(option)} />
		</span>
	)
}

/**
 * The line below the label of an entry. A screen reader reads the kind of the
 * entry before it, because the icon has no text.
 */
export function ResultSubtitle({ option }: { option: Matchable }) {
	const intl = useIntl()

	return (
		<>
			{option.kind !== 'component' && (
				<span className="sr-only">{`${intl.formatMessage(KIND_LABELS[option.kind])}, `}</span>
			)}
			<bdi>{formatSubtitle(intl, option)}</bdi>
		</>
	)
}

/** A result of the search, with the id of its option. */
export type SearchOption = Matchable & { id: string }

/** One row of the results: it goes to the entry on a pick. */
export function SearchResult({
	option,
	meta,
	onPick,
}: {
	option: SearchOption
	meta: VirtualOptionMeta
	onPick: () => void
}) {
	return (
		<CommandPaletteItem id={option.id} href={option.href} onAction={onPick} {...meta}>
			<ResultIcon option={option} />
			{/*
			 * A name from the code, such as <Grid />, keeps its order on a
			 * right-to-left page in its own bdi.
			 */}
			<CommandPaletteText>
				<CommandPaletteLabel>
					<bdi>{option.label}</bdi>
				</CommandPaletteLabel>
				<CommandPaletteDescription>
					<ResultSubtitle option={option} />
				</CommandPaletteDescription>
			</CommandPaletteText>
		</CommandPaletteItem>
	)
}
