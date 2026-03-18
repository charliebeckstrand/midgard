import { cn } from '../core'

export function ChevronIcon({ className }: { className?: string }) {
	return (
		<svg
			className={cn(
				'size-5 stroke-zinc-500 dark:stroke-zinc-400 forced-colors:stroke-[CanvasText]',
				className,
			)}
			viewBox="0 0 16 16"
			aria-hidden="true"
			fill="none"
		>
			<path
				d="M5.75 10.75L8 13L10.25 10.75"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M10.25 5.25L8 3L5.75 5.25"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

export function CheckIcon({ className }: { className?: string }) {
	return (
		<svg
			className={cn('size-5 stroke-current', className)}
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
		>
			<path d="M4 8.5l3 3L12 4" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	)
}

export function MenuIcon({ className }: { className?: string }) {
	return (
		<svg data-slot="icon" className={cn(className)} viewBox="0 0 20 20" aria-hidden="true">
			<path d="M2 6.75C2 6.33579 2.33579 6 2.75 6H17.25C17.6642 6 18 6.33579 18 6.75C18 7.16421 17.6642 7.5 17.25 7.5H2.75C2.33579 7.5 2 7.16421 2 6.75ZM2 13.25C2 12.8358 2.33579 12.5 2.75 12.5H17.25C17.6642 12.5 18 12.8358 18 13.25C18 13.6642 17.6642 14 17.25 14H2.75C2.33579 14 2 13.6642 2 13.25Z" />
		</svg>
	)
}

export function CheckboxIcon({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={cn(
				'size-5 stroke-(--checkbox-check) opacity-0 group-data-checked:opacity-100',
				className,
			)}
			viewBox="0 0 14 14"
			fill="none"
		>
			<path
				className="opacity-100 group-data-indeterminate:opacity-0"
				d="M3 8L6 11L11 3.5"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				className="opacity-0 group-data-indeterminate:opacity-100"
				d="M3 7H11"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

export function CloseIcon() {
	return (
		<svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true">
			<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
		</svg>
	)
}
