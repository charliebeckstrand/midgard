'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Checklist, ChecklistItem } from '../../components/checklist'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Feedback' }

export default function ChecklistDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<Checklist title="Get started" description="Finish these steps to set up your workspace">
					<ChecklistItem complete title="Create an account" />
					<ChecklistItem complete title="Verify your email" />
					<ChecklistItem
						title="Invite your team"
						description="Add collaborators to unlock shared workspaces"
					/>
					<ChecklistItem title="Connect a data source" />
				</Checklist>
			</Example>

			<Example title="With item actions">
				<Checklist title="Onboarding">
					<ChecklistItem complete title="Confirm your email" />
					<ChecklistItem
						title="Install the CLI"
						description="Run it locally to sync your project"
						actions={<Button variant="plain">Install</Button>}
					/>
					<ChecklistItem
						title="Deploy your first project"
						actions={<Button variant="plain">Deploy</Button>}
					/>
				</Checklist>
			</Example>

			<Example title="Collapsible">
				<Checklist collapsible title="Get started" description="Tap the header to collapse">
					<ChecklistItem complete title="Create an account" />
					<ChecklistItem complete title="Verify your email" />
					<ChecklistItem title="Invite your team" />
				</Checklist>
			</Example>

			<InteractiveChecklist />
		</Stack>
	)
}

const steps = [
	{ id: 'account', title: 'Create an account' },
	{ id: 'verify', title: 'Verify your email' },
	{ id: 'team', title: 'Invite your team' },
	{ id: 'source', title: 'Connect a data source' },
]

function InteractiveChecklist() {
	const [done, setDone] = useState<Set<string>>(new Set(['account']))

	function toggle(id: string) {
		setDone((prev) => {
			const next = new Set(prev)

			if (next.has(id)) next.delete(id)
			else next.add(id)

			return next
		})
	}

	return (
		<Example title="Interactive">
			<Checklist title="Get started" collapsible>
				{steps.map((step) => (
					<ChecklistItem
						key={step.id}
						complete={done.has(step.id)}
						title={step.title}
						actions={
							<Button variant="plain" onClick={() => toggle(step.id)}>
								{done.has(step.id) ? 'Undo' : 'Mark done'}
							</Button>
						}
					/>
				))}
			</Checklist>
		</Example>
	)
}
