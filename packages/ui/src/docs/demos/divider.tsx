import { Divider } from '../../components/divider'

export const meta = { category: 'Layout' }

export default function DividerDemo() {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Default</p>
				<Divider />
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Soft</p>
				<Divider soft />
			</div>
		</div>
	)
}
