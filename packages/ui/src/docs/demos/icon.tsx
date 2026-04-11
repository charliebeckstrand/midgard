'use client'

import { Heart, Plus, Search, Star } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/alert'
import { Icon } from '../../components/icon'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function IconDemo() {
	return (
		<div className="space-y-8">
			<Example title="Usage">
				<div className="flex items-center gap-4 dark:text-white">
					<Icon icon={<Search />} />
					<Icon icon={<Heart />} />
					<Icon icon={<Star />} />
				</div>
			</Example>
			<Example title="Sizes">
				<div className="flex items-center gap-4 dark:text-white">
					{sizes.map((s) => (
						<div key={s} className="flex flex-col items-center gap-2">
							<Icon icon={<Plus />} size={s} />
							<span className="text-xs text-zinc-500">{s}</span>
						</div>
					))}
				</div>
			</Example>
			<Example title="Custom size">
				<div className="dark:text-white">
					<Icon icon={<Star />} size={32} />
				</div>
			</Example>
			<Example title="Any icon library">
				<Alert type="info">
					<AlertDescription>
						The Icon component can wrap any SVG icon component, not just those from Lucide. It
						provides consistent sizing and accessibility features across different icon libraries.
					</AlertDescription>
				</Alert>
			</Example>
		</div>
	)
}
