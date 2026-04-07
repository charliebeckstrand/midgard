'use client'

import { useState } from 'react'
import { Icon, type IconName } from '../../components/icon'
import { iconData } from '../../components/icon/icon-data'
import { Input } from '../../components/input'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Base' }

const allNames = (Object.keys(iconData) as IconName[]).sort((a, b) => {
	const baseA = a.replace(/-\d+$/, '')
	const baseB = b.replace(/-\d+$/, '')

	if (baseA !== baseB) return baseA.localeCompare(baseB)

	// Base name (no suffix) comes first
	if (a === baseA) return -1
	if (b === baseB) return 1

	return a.localeCompare(b)
})

const sizes = ['sm', 'md', 'lg'] as const

function IconCard({ name }: { name: IconName }) {
	const [copied, setCopied] = useState(false)

	function copy() {
		navigator.clipboard.writeText(name)

		setCopied(true)

		setTimeout(() => setCopied(false), 1500)
	}

	return (
		<button
			type="button"
			onClick={copy}
			className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-white dark:hover:bg-zinc-800"
		>
			<Icon name={name} />
			<span className={`text-xs whitespace-nowrap ${copied ? 'text-green-600' : 'text-zinc-500'}`}>
				{copied ? 'Copied!' : name}
			</span>
		</button>
	)
}

export default function IconDemo() {
	const [query, setQuery] = useState('')

	const filtered = allNames.filter((name) => !query || name.includes(query.toLowerCase()))

	return (
		<div className="space-y-8">
			<Input placeholder="Search icons" value={query} onChange={(e) => setQuery(e.target.value)} />
			<Example
				title="All icons"
				code={code`
					import { Icon } from 'ui/icon'

					<Icon name="plus" />
				`}
			>
				{filtered.length > 0 ? (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
						{filtered.map((name) => (
							<IconCard key={name} name={name} />
						))}
					</div>
				) : (
					<p className="py-2 text-center text-sm text-zinc-500 dark:text-amber-500">
						No icons match "{query}"
					</p>
				)}
			</Example>
			<Example
				title="Sizes"
				code={code`
					import { Icon } from 'ui/icon'

					<Icon name="plus" size="sm" />
					<Icon name="plus" size="md" />
					<Icon name="plus" size="lg" />
				`}
			>
				<div className="flex items-center gap-4 dark:text-white">
					{sizes.map((size) => (
						<div key={size} className="flex flex-col items-center gap-2">
							<Icon name="plus" size={size} />
							<span className="text-xs text-zinc-500">{size}</span>
						</div>
					))}
				</div>
			</Example>
		</div>
	)
}
