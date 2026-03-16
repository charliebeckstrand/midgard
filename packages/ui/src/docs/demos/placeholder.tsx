import {
	Placeholder,
	PlaceholderInput,
	PlaceholderSidebarItem,
	PlaceholderTextarea,
} from '../../components/placeholder'

export const meta = { category: 'Feedback' }

export default function PlaceholderDemo() {
	return (
		<div className="max-w-md space-y-8">
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Default (3 bars)</p>
				<Placeholder />
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Custom bars</p>
				<Placeholder bars={5} />
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Input</p>
				<PlaceholderInput />
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Textarea</p>
				<PlaceholderTextarea />
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Sidebar item</p>
				<PlaceholderSidebarItem />
			</div>
		</div>
	)
}
