'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../components/collapse'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

export default function CollapseDemo() {
	const [open, setOpen] = useState(false)

	return (
		<div className="space-y-8">
			<Example title="String trigger">
				<Collapse trigger="Toggle details">
					<p className="pt-2 text-sm text-zinc-500">
						When the trigger is a string, Collapse renders it as muted text that highlights on
						hover. The panel animates open with a smooth height transition.
					</p>
				</Collapse>
			</Example>
			<Example title="Default open">
				<Collapse defaultOpen trigger="Toggle details">
					<p className="pt-2 text-sm text-zinc-500">
						This content is visible by default because the collapse starts open.
					</p>
				</Collapse>
			</Example>
			<Example title="Compound API">
				<Collapse>
					<CollapseTrigger>{({ open }) => (open ? 'Hide code' : 'Show code')}</CollapseTrigger>
					<CollapsePanel>
						<p className="pt-2 text-sm text-zinc-500">
							Use the compound API when you need a render-prop trigger that reacts to the open
							state.
						</p>
					</CollapsePanel>
				</Collapse>
			</Example>
			<Example title="Controlled">
				<div className="space-y-2">
					<Button onClick={() => setOpen((o) => !o)}>
						{open ? 'Hide panel' : 'Show panel'}
					</Button>
					<Collapse open={open} onOpenChange={setOpen}>
						<CollapsePanel>
							<p className="pt-2 text-sm text-zinc-500">
								Pass <code>open</code> and <code>onOpenChange</code> to drive Collapse from parent
								state. Any external button can toggle the panel.
							</p>
						</CollapsePanel>
					</Collapse>
				</div>
			</Example>
		</div>
	)
}
