'use client'

import { useState } from 'react'
import { JsonTree } from '../../components/json-tree'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const sample = {
	id: 42,
	name: 'Ada Lovelace',
	active: true,
	meta: null,
	tags: ['engineer', 'mathematician'],
	address: {
		city: 'London',
		zip: 'WC2N',
		geo: { lat: 51.507, lng: -0.127 },
	},
	orders: [
		{ id: 1, total: 19.99, shipped: true },
		{ id: 2, total: 7.5, shipped: false },
	],
}

export default function JsonTreeDemo() {
	const [lastCopied, setLastCopied] = useState<string | null>(null)

	return (
		<Stack gap={6}>
			<Example
				title="Default"
				code={code`
					import { JsonTree } from 'ui/json-tree'

					<JsonTree data={data} />
				`}
			>
				<Sizer>
					<JsonTree data={sample} />
				</Sizer>
			</Example>

			<Example
				title="Expand all levels"
				code={code`
					import { JsonTree } from 'ui/json-tree'

					<JsonTree data={data} defaultExpandDepth={Infinity} />
				`}
			>
				<Sizer>
					<JsonTree data={sample} defaultExpandDepth={Number.POSITIVE_INFINITY} />
				</Sizer>
			</Example>

			<Example
				title="Collapsed by default"
				code={code`
					import { JsonTree } from 'ui/json-tree'

					<JsonTree data={data} defaultExpandDepth={0} />
				`}
			>
				<Sizer>
					<JsonTree data={sample} defaultExpandDepth={0} />
				</Sizer>
			</Example>

			<Example
				title="Copy path"
				code={code`
					import { JsonTree } from 'ui/json-tree'

					<JsonTree
						data={data}
						onCopyPath={(path) => console.log(path)}
					/>
				`}
			>
				<Sizer>
					<Stack gap={3}>
						<JsonTree
							data={sample}
							onCopyPath={(path) => setLastCopied(path.join('.') || '<root>')}
						/>
						{lastCopied && <Text size="sm">Last copied: {lastCopied}</Text>}
					</Stack>
				</Sizer>
			</Example>

			<Example
				title="Arrays of primitives"
				code={code`
					import { JsonTree } from 'ui/json-tree'

					<JsonTree data={['alpha', 'beta', 'gamma']} />
				`}
			>
				<Sizer>
					<JsonTree
						data={['alpha', 'beta', 'gamma', 1, 2, 3, true, false, null]}
						defaultExpandDepth={Number.POSITIVE_INFINITY}
					/>
				</Sizer>
			</Example>
		</Stack>
	)
}
