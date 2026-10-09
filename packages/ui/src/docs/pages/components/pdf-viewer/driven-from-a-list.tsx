import { useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { PdfViewer } from 'ui/pdf-viewer'
import { Stack } from 'ui/stack'
import { pages, regions } from './statement.ts'

export default function DrivenFromAList() {
	const [active, setActive] = useState<string | null>('remit')

	return (
		<Stack gap="md">
			<Flex wrap gap="sm">
				{regions.map((region) => (
					<Button
						key={region.id}
						variant={active === region.id ? 'solid' : 'outline'}
						aria-pressed={active === region.id}
						onClick={() => setActive(region.id)}
					>
						{region.label}
					</Button>
				))}
			</Flex>
			<PdfViewer
				pages={pages}
				highlights={regions}
				activeHighlightId={active}
				onActiveHighlightChange={setActive}
				aria-label="Statement driven from a list"
			/>
		</Stack>
	)
}
