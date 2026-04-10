import { Button } from '../../components/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/popover'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

const placements = ['left', 'top', 'bottom', 'right'] as const

export default function PopoverDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Basic"
				code={code`
					import { Popover, PopoverContent, PopoverTrigger } from 'ui/popover'
					import { Button } from 'ui/button'

					<Popover>
						<PopoverTrigger>
							<Button variant="outline">Open popover</Button>
						</PopoverTrigger>
						<PopoverContent>
							<p className="text-sm font-medium">Popover content</p>
							<p className="mt-1 text-sm text-zinc-500">This is a general-purpose floating container.</p>
						</PopoverContent>
					</Popover>
				`}
			>
				<Popover>
					<PopoverTrigger>
						<Button variant="outline">Open popover</Button>
					</PopoverTrigger>
					<PopoverContent>
						<p className="text-sm font-medium">Popover content</p>
						<p className="mt-1 text-sm text-zinc-500">
							This is a general-purpose floating container.
						</p>
					</PopoverContent>
				</Popover>
			</Example>

			<Example
				title="Placement"
				code={code`
					import { Popover, PopoverContent, PopoverTrigger } from 'ui/popover'
					import { Button } from 'ui/button'

					${placements.map((p) => `<Popover placement="${p}">\n  <PopoverTrigger>\n    <Button variant="outline">${p}</Button>\n  </PopoverTrigger>\n  <PopoverContent>Popover on ${p}</PopoverContent>\n</Popover>`)}
				`}
			>
				<div className="flex flex-wrap items-center justify-center gap-4 py-8">
					{placements.map((placement) => (
						<Popover key={placement} placement={placement}>
							<PopoverTrigger>
								<Button variant="outline">{placement}</Button>
							</PopoverTrigger>
							<PopoverContent>Popover on {placement}</PopoverContent>
						</Popover>
					))}
				</div>
			</Example>
		</div>
	)
}
