import type { ReactNode } from 'react'

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
		<main data-slot="fixture-sheet" className="flex flex-col gap-8 p-4 sm:p-8">
			<h1 className="text-xl font-semibold">{title}</h1>
			{children}
		</main>
	)
}

/** One group of cases on a sheet, for example the cases of one component. */
export function FixtureGroup({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</h2>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
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
		<div
			className={
				wide
					? 'flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-3'
					: 'flex min-w-0 flex-col gap-2'
			}
		>
			<span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
			<div className="flex min-w-0 flex-wrap items-start gap-2">{children}</div>
		</div>
	)
}
