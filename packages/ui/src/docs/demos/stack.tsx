import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

function Box({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-12 min-w-12 items-center justify-center rounded-md bg-zinc-200 px-3 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
			{children}
		</div>
	)
}

export default function StackDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Column (default)"
				code={code`
					import { Stack } from 'ui/stack'

					<Stack gap={3}>
						<Box>One</Box>
						<Box>Two</Box>
						<Box>Three</Box>
					</Stack>
				`}
			>
				<Stack gap={3}>
					<Box>One</Box>
					<Box>Two</Box>
					<Box>Three</Box>
				</Stack>
			</Example>

			<Example
				title="Row"
				code={code`
					import { Stack } from 'ui/stack'

					<Stack direction="row" gap={3}>
						<Box>One</Box>
						<Box>Two</Box>
						<Box>Three</Box>
					</Stack>
				`}
			>
				<Stack direction="row" gap={3}>
					<Box>One</Box>
					<Box>Two</Box>
					<Box>Three</Box>
				</Stack>
			</Example>

			<Example
				title="Align and justify"
				code={code`
					import { Stack } from 'ui/stack'

					<Stack direction="row" gap={3} justify="between" align="center" className="h-24">
						<Box>Start</Box>
						<Box>Middle</Box>
						<Box>End</Box>
					</Stack>
				`}
			>
				<Stack
					direction="row"
					gap={3}
					justify="between"
					align="center"
					className="h-24 w-full rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700"
				>
					<Box>Start</Box>
					<Box>Middle</Box>
					<Box>End</Box>
				</Stack>
			</Example>

			<Example
				title="Wrap"
				code={code`
					import { Stack } from 'ui/stack'
					import { Badge } from 'ui/badge'

					<Stack direction="row" gap={2} wrap>
						<Badge>design</Badge>
						<Badge>engineering</Badge>
						<Badge>product</Badge>
						{/* … */}
					</Stack>
				`}
			>
				<Stack direction="row" gap={2} wrap>
					<Badge>design</Badge>
					<Badge>engineering</Badge>
					<Badge>product</Badge>
					<Badge>research</Badge>
					<Badge>operations</Badge>
					<Badge>marketing</Badge>
					<Badge>support</Badge>
				</Stack>
			</Example>

			<Example
				title="Composed with buttons"
				code={code`
					import { Stack } from 'ui/stack'
					import { Button } from 'ui/button'

					<Stack direction="row" gap={3} justify="end">
						<Button variant="plain">Cancel</Button>
						<Button>Save changes</Button>
					</Stack>
				`}
			>
				<Stack direction="row" gap={3} justify="end">
					<Button variant="plain">Cancel</Button>
					<Button>Save changes</Button>
				</Stack>
			</Example>
		</div>
	)
}
