import { Stack, type StackProps } from 'ui/stack'

const items = ['One', 'Two', 'Three']

export default function StackPlayground(props: StackProps) {
	return (
		<div className="flex h-44 overflow-hidden rounded-lg border border-zinc-950/10 p-2 dark:border-white/10">
			<Stack
				gap="sm"
				className="rounded-md border border-dashed border-zinc-400 p-1 dark:border-zinc-600"
				{...props}
			>
				{items.map((item) => (
					<div
						key={item}
						className="flex h-7 items-center rounded-md bg-zinc-950/5 px-2 text-sm dark:bg-white/10"
					>
						{item}
					</div>
				))}
			</Stack>
		</div>
	)
}
