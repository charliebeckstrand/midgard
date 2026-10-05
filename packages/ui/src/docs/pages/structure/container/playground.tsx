import { Container, type ContainerProps } from 'ui/container'

export default function ContainerPlayground(props: ContainerProps) {
	return (
		<div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
			<Container {...props}>
				<div className="rounded-md bg-zinc-950/5 px-3 py-2 text-sm dark:bg-white/10">Content</div>
			</Container>
		</div>
	)
}
