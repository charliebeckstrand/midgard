import { Placeholder } from '../../components/placeholder'

export const meta = { category: 'Feedback' }

export default function PlaceholderDemo() {
	return (
		<div className="max-w-md space-y-8">
			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Line (default)</p>
				<Placeholder />
				<Placeholder className="max-w-[70%]" />
				<Placeholder className="max-w-[50%]" />
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Rectangle</p>
				<Placeholder variant="rect" className="h-10" />
				<Placeholder variant="rect" className="h-24" />
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Circle</p>
				<div className="flex items-center gap-3">
					<Placeholder variant="circle" className="size-8" />
					<Placeholder variant="circle" className="size-10" />
					<Placeholder variant="circle" className="size-12" />
				</div>
			</section>

			<section className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Composed layout</p>
				<div className="flex items-start gap-3">
					<Placeholder variant="circle" className="size-10" />
					<div className="flex-1 space-y-2">
						<Placeholder className="max-w-[40%]" />
						<Placeholder />
						<Placeholder className="max-w-[80%]" />
					</div>
				</div>
			</section>
		</div>
	)
}
