import type { ReactNode } from 'react'
import { Columns } from '../../structure/columns'
import { Flex } from '../../structure/flex'
import { Stack } from '../../structure/stack'

/**
 * The frame of one fixture sheet: a title, then each case in a grid.
 *
 * @remarks
 * A sheet shows each component of a family at its defaults and in the states
 * that do not need an interaction: disabled, invalid, and a long label in a
 * full-width container. A sheet uses fixed data only, and no clock, so that two
 * runs on the same commit give the same pixels.
 */
export function FixtureSheet({ title, children }: { title: string; children: ReactNode }) {
	return (
		<main data-slot="fixture-sheet" className="p-4 sm:p-8">
			<Stack gap="xl">
				<h1 className="text-xl font-semibold">{title}</h1>
				{children}
			</Stack>
		</main>
	)
}

/** One group of cases on a sheet, for example the cases of one component. */
export function FixtureGroup({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section>
			<Stack gap="md">
				<h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</h2>
				<Columns columns={{ initial: 1, sm: 2, lg: 3 }} gap="lg">
					{children}
				</Columns>
			</Stack>
		</section>
	)
}

/**
 * One case: a label and the rendered component.
 *
 * @remarks
 * A case does not grow past its column, so a wide component scrolls in its own
 * box and does not widen the page.
 *
 * @param wide - Span the full row, for a case that tests a full-width container.
 */
export function FixtureCase({
	label,
	wide,
	children,
}: {
	label: string
	wide?: boolean
	children: ReactNode
}) {
	return (
		<Stack gap="sm" className={wide ? 'min-w-0 sm:col-span-2 lg:col-span-3' : 'min-w-0'}>
			<span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
			<Flex align="start" gap="sm" wrap className="min-w-0">
				{children}
			</Flex>
		</Stack>
	)
}
