import {
	Blocks,
	Braces,
	GapHorizontal,
	LayoutDashboard,
	type LucideIcon,
	PanelTop,
	Shapes,
	SquareDashed,
	Workflow,
} from 'lucide-react'
import {
	CommandPaletteDescription,
	CommandPaletteItem,
	CommandPaletteLabel,
	CommandPaletteText,
} from 'ui/command-palette'
import { Icon } from 'ui/icon'
import { defineMessages, type MessageDescriptor, useIntl } from 'ui/primitives/intl'
import type { VirtualOptionMeta } from 'ui/primitives/virtual-options'
import { sectionLabel } from '../../app/app-messages.ts'
import type { Matchable } from '../engine/index.ts'
import type { SearchKind } from '../types.ts'
import { findSection } from './localize.ts'

// One row of the results of the search: a tinted icon of the kind of the
// entry, its label, and the section of the entry below it.

// The kind of each entry. A screen reader reads it before the section, because
// the icon has no text.
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
	layouts: LayoutDashboard,
	structure: SquareDashed,
	primitives: GapHorizontal,
	providers: Workflow,
}

/**
 * The tint of the icon of a page, by the folder of its section. Each section
 * has its own color, and no section has the color of a tab or of an API
 * reference.
 */
const SECTION_TINT: Readonly<Record<string, string>> = {
	components: 'bg-blue-500/12 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300',
	modules: 'bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300',
	layouts: 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
	structure: 'bg-rose-500/12 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300',
	primitives: 'bg-lime-500/15 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300',
	providers: 'bg-fuchsia-500/12 text-fuchsia-600 dark:bg-fuchsia-400/15 dark:text-fuchsia-300',
}

function getTint(option: Matchable): string {
	if (option.kind !== 'page') return KIND_TINT[option.kind]

	return SECTION_TINT[findSection(option.href)] ?? KIND_TINT.page
}

function getIcon(option: Matchable): LucideIcon {
	if (option.kind !== 'page') return KIND_ICON[option.kind]

	return SECTION_ICON[findSection(option.href)] ?? Shapes
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
 * The label of an entry. A tab names its page first, as in "Grid › Sorting",
 * so the line below each label can be the section.
 */
export function ResultLabel({ option }: { option: Matchable }) {
	return <bdi>{option.kind === 'tab' ? (option.place ?? option.label) : option.label}</bdi>
}

/**
 * The section of an entry, the line below its label. A screen reader reads
 * the kind of the entry before it, because the icon has no text.
 */
export function ResultSubtitle({ option }: { option: Matchable }) {
	const intl = useIntl()

	return (
		<>
			<span className="sr-only">{`${intl.formatMessage(KIND_LABELS[option.kind])}, `}</span>
			{sectionLabel(intl, findSection(option.href))}
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
					<ResultLabel option={option} />
				</CommandPaletteLabel>
				<CommandPaletteDescription>
					<ResultSubtitle option={option} />
				</CommandPaletteDescription>
			</CommandPaletteText>
		</CommandPaletteItem>
	)
}
