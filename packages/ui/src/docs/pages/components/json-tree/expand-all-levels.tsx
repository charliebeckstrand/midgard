import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { collectJsonTreePaths, JsonTree } from 'ui/json-tree'
import { Stack } from 'ui/stack'
import { sample } from './sample.ts'

const allPaths = collectJsonTreePaths(sample)

export default function ExpandAllLevels() {
	const [expanded, setExpanded] = useState<Set<string>>(allPaths)

	const allExpanded = expanded.size === allPaths.size

	return (
		<Stack gap="lg">
			<Flex>
				<Button variant="outline" onClick={() => setExpanded(allExpanded ? new Set() : allPaths)}>
					{allExpanded ? 'Collapse all' : 'Expand all'}
				</Button>
			</Flex>
			<JsonTree data={sample} expanded={expanded} onExpandedChange={setExpanded} />
		</Stack>
	)
}
