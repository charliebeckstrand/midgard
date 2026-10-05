import { Card } from 'ui/card'
import { Split } from 'ui/split'

export default function SidebarLayout() {
	return (
		<Split ratio="1/3">
			<Card>
				<div className="line-clamp-1">Sidebar (1/3)</div>
			</Card>
			<Card>
				<div className="line-clamp-1">Main content (2/3)</div>
			</Card>
		</Split>
	)
}
