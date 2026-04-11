import type React from 'react'
import { cn } from '../../core'
import { Placeholder } from '../placeholder'

/**
 * Hand-composed skeleton shapes for common components.
 *
 * Each entry returns JSX built from `Placeholder` primitives and tailwind
 * layout classes — no new styling is introduced. Entries are intentionally
 * approximate: they mimic the silhouette of the target component, not every
 * pixel of its chrome.
 */
const presets = {
	avatar: () => <Placeholder variant="circle" className="size-10" />,
	badge: () => <Placeholder variant="rect" className="h-5 w-14" />,
	breadcrumb: () => (
		<div className="flex items-center gap-2">
			<Placeholder className="h-3 w-12" />
			<span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">
				/
			</span>
			<Placeholder className="h-3 w-16" />
			<span className="text-zinc-300 dark:text-zinc-600" aria-hidden="true">
				/
			</span>
			<Placeholder className="h-3 w-20" />
		</div>
	),
	button: () => <Placeholder variant="rect" className="h-10 w-24 rounded-lg" />,
	card: () => (
		<div className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
			<Placeholder variant="rect" className="h-32 w-full" />
			<div className="space-y-2">
				<Placeholder className="h-4 max-w-[60%]" />
				<Placeholder className="h-3" />
				<Placeholder className="h-3 max-w-[80%]" />
			</div>
		</div>
	),
	checkbox: () => (
		<div className="flex items-center gap-3">
			<Placeholder variant="rect" className="size-4 rounded" />
			<Placeholder className="h-3 w-32" />
		</div>
	),
	chip: () => <Placeholder variant="rect" className="h-7 w-20 rounded-full" />,
	heading: () => <Placeholder className="h-7 w-1/2" />,
	input: () => <Placeholder variant="rect" className="h-10 w-full max-w-sm rounded-lg" />,
	listbox: () => (
		<div className="w-full max-w-sm space-y-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
			{[90, 70, 85, 60].map((width, i) => (
				<div key={width} className="flex items-center gap-3 px-2 py-1.5">
					<Placeholder variant="circle" className="size-5 shrink-0" />
					<Placeholder className="h-3" style={{ width: `${width}%`, opacity: 1 - i * 0.05 }} />
				</div>
			))}
		</div>
	),
	navbar: () => (
		<div className="flex w-full items-center justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
			<div className="flex items-center gap-3">
				<Placeholder variant="circle" className="size-7" />
				<Placeholder className="h-3 w-20" />
			</div>
			<div className="flex items-center gap-4">
				<Placeholder className="h-3 w-12" />
				<Placeholder className="h-3 w-12" />
				<Placeholder className="h-3 w-12" />
			</div>
			<Placeholder variant="circle" className="size-8" />
		</div>
	),
	pagination: () => (
		<div className="flex items-center gap-1">
			{[...Array(5)].map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
				<Placeholder key={i} variant="rect" className="size-9 rounded-md" />
			))}
		</div>
	),
	radio: () => (
		<div className="flex items-center gap-3">
			<Placeholder variant="circle" className="size-4" />
			<Placeholder className="h-3 w-32" />
		</div>
	),
	sidebar: () => (
		<div className="w-56 space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
			<Placeholder className="mb-3 h-4 w-20" />
			{[75, 60, 85, 50, 70].map((width, i) => (
				<div
					key={width}
					className="flex items-center gap-3 rounded-md px-2 py-1.5"
					style={{ opacity: 1 - i * 0.06 }}
				>
					<Placeholder variant="circle" className="size-4 shrink-0" />
					<Placeholder className="h-3" style={{ width: `${width}%` }} />
				</div>
			))}
		</div>
	),
	stat: () => (
		<div className="space-y-2">
			<Placeholder className="h-3 w-24" />
			<Placeholder className="h-8 w-32" />
			<Placeholder className="h-3 w-20" />
		</div>
	),
	switch: () => <Placeholder variant="rect" className="h-6 w-10 rounded-full" />,
	table: () => (
		<div className="w-full space-y-3">
			<div className="flex gap-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
				<Placeholder className="h-3 w-1/4" />
				<Placeholder className="h-3 w-1/3" />
				<Placeholder className="h-3 w-1/5" />
				<Placeholder className="h-3 w-1/6" />
			</div>
			{[...Array(4)].map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
				<div key={i} className="flex gap-4">
					<Placeholder className="h-3 w-1/4" />
					<Placeholder className="h-3 w-1/3" />
					<Placeholder className="h-3 w-1/5" />
					<Placeholder className="h-3 w-1/6" />
				</div>
			))}
		</div>
	),
	tabs: () => (
		<div className="w-full space-y-3">
			<div className="flex gap-6 border-b border-zinc-200 dark:border-zinc-800">
				{[12, 16, 14].map((width, i) => (
					<div key={width} className="pb-2" data-active={i === 0 || undefined}>
						<Placeholder className="h-3" style={{ width: `${width * 4}px` }} />
					</div>
				))}
			</div>
			<Placeholder className="h-3" />
			<Placeholder className="h-3 max-w-[85%]" />
		</div>
	),
	text: () => (
		<div className="w-full max-w-md space-y-2">
			<Placeholder className="h-3 max-w-[70%]" />
			<Placeholder className="h-3 max-w-[90%]" />
			<Placeholder className="h-3 max-w-[50%]" />
		</div>
	),
	textarea: () => <Placeholder variant="rect" className="h-28 w-full max-w-sm rounded-lg" />,
	toast: () => (
		<div className="flex w-full max-w-sm items-start gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
			<Placeholder variant="circle" className="size-5 shrink-0" />
			<div className="flex-1 space-y-2">
				<Placeholder className="h-3 w-1/3" />
				<Placeholder className="h-3 w-5/6" />
			</div>
		</div>
	),
} as const satisfies Record<string, () => React.ReactElement>

export type SkeletonComponent = keyof typeof presets

/** Sorted list of components with a skeleton preset. */
export const skeletonComponents = Object.keys(presets).sort() as SkeletonComponent[]

export type SkeletonProps = {
	component: SkeletonComponent
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'output'>, 'className'>

export function Skeleton({ component, className, ...props }: SkeletonProps) {
	return (
		<output
			data-slot="skeleton"
			data-component={component}
			aria-label={`Loading ${component}`}
			className={cn('block', className)}
			{...props}
		>
			{presets[component]()}
		</output>
	)
}
