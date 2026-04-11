'use client'

import { Heart, Plus, Search, Star } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../../components/alert'
import { Code } from '../../components/code'
import { Icon } from '../../components/icon'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function IconDemo() {
	return (
		<div className="space-y-8">
			<Alert type="info" closable>
				<AlertTitle>SVG support</AlertTitle>
				<AlertDescription>
					The <Code>&lt;Icon&gt;</Code> component can wrap any SVG icon component. It provides a
					consistent interface for sizing and styling icons.
				</AlertDescription>
			</Alert>
			<Example title="Default">
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
		</div>
	)
}
