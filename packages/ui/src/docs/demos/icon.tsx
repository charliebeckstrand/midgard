'use client'

import { Heart, Plus, Search, Star } from 'lucide-react'
import { Icon } from '../../components/icon'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Base' }

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function IconDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Usage"
				code={code`
					import { Search, Heart, Star } from 'lucide-react'
					import { Icon } from 'ui/icon'

					<Icon icon={<Search />} />
					<Icon icon={<Heart />} />
					<Icon icon={<Star />} />
				`}
			>
				<div className="flex items-center gap-4 dark:text-white">
					<Icon icon={<Search />} />
					<Icon icon={<Heart />} />
					<Icon icon={<Star />} />
				</div>
			</Example>
			<Example
				title="Sizes"
				code={code`
					import { Plus } from 'lucide-react'
					import { Icon } from 'ui/icon'

					<Icon icon={<Plus />} size="xs" />
					<Icon icon={<Plus />} size="sm" />
					<Icon icon={<Plus />} size="md" />
					<Icon icon={<Plus />} size="lg" />
				`}
			>
				<div className="flex items-center gap-4 dark:text-white">
					{sizes.map((s) => (
						<div key={s} className="flex flex-col items-center gap-2">
							<Icon icon={<Plus />} size={s} />
							<span className="text-xs text-zinc-500">{s}</span>
						</div>
					))}
				</div>
			</Example>
			<Example
				title="Custom size"
				code={code`
					import { Star } from 'lucide-react'
					import { Icon } from 'ui/icon'

					<Icon icon={<Star />} size={32} />
				`}
			>
				<div className="dark:text-white">
					<Icon icon={<Star />} size={32} />
				</div>
			</Example>
			<Example
				title="Any icon library"
				code={code`
					// Works with any SVG icon component.
					// The Icon wrapper handles sizing and accessibility.

					// Lucide (lucide-react)
					import { Search } from 'lucide-react'
					<Icon icon={<Search />} />

					// Heroicons (@heroicons/react)
					import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
					<Icon icon={<MagnifyingGlassIcon />} />

					// Custom SVG component
					<Icon icon={<MyCustomIcon />} />
				`}
			>
				<div className="flex items-center gap-4 dark:text-white">
					<Icon icon={<Search />} />
					<span className="text-sm text-zinc-500">
						Works with Lucide, Heroicons, Font Awesome, or any SVG component
					</span>
				</div>
			</Example>
		</div>
	)
}
