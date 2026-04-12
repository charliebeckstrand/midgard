import { ArrowUp, CircleDashed, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function TextareaDemo() {
	const [withActionsValue, setWithActionsValue] = useState('')

	return (
		<div className="space-y-8">
			<Example title="Default">
				<Field className="lg:max-w-sm">
					<Label htmlFor="textarea-message">Message</Label>
					<Textarea id="textarea-message" resize="vertical" placeholder="Write your message" />
				</Field>
			</Example>
			<Example title="Non-resizable">
				<Field className="lg:max-w-sm">
					<Label htmlFor="textarea-non-resizable">Non-resizable</Label>
					<Textarea id="textarea-non-resizable" placeholder="Cannot resize" />
				</Field>
			</Example>
			<Example title="Auto resize">
				<Field className="lg:max-w-sm">
					<Label htmlFor="textarea-auto-resize">Auto resize</Label>
					<Textarea id="textarea-auto-resize" autoResize rows={1} placeholder="Grows as you type" />
				</Field>
			</Example>
			<Example title="With actions">
				<Field className="lg:max-w-sm">
					<Label htmlFor="textarea-actions">Prompt</Label>
					<Textarea
						id="textarea-actions"
						value={withActionsValue}
						onChange={(e) => setWithActionsValue(e.target.value)}
						autoResize
						rows={3}
						placeholder="Ask anything"
						actions={
							<>
								<Button variant="plain" size="sm">
									<Icon icon={<CircleDashed />} />
									<span className="ml-1">Data Analyst</span>
								</Button>
								<Button variant="plain" size="sm" className="ml-auto">
									<Icon icon={<Plus />} />
								</Button>
								<Button size="sm" color="blue" disabled={!withActionsValue.trim()}>
									<Icon icon={<ArrowUp />} />
								</Button>
							</>
						}
					/>
				</Field>
			</Example>
			<Example title="Invalid">
				<Field className="lg:max-w-sm">
					<Label htmlFor="textarea-invalid">Invalid</Label>
					<Textarea id="textarea-invalid" data-invalid={true} placeholder="Something went wrong" />
				</Field>
			</Example>
		</div>
	)
}
