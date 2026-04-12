import { ArrowUp, CircleDashed, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Sizer } from '../../components/sizer'
import { Textarea } from '../../components/textarea'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const variants = ['default', 'outline', 'glass'] as const

export default function TextareaDemo() {
	const [withActionsValue, setWithActionsValue] = useState('')

	return (
		<div className="space-y-8">
			<Example title="Default">
				<Sizer>
					<Field>
						<Label htmlFor="textarea-message">Message</Label>
						<Textarea id="textarea-message" resize="vertical" placeholder="Write your message" />
					</Field>
				</Sizer>
			</Example>
			<Example title="Variants">
				{variants.map((variant) => (
					<Sizer key={variant}>
						<Field>
							<Label htmlFor={`textarea-${variant}`}>
								{variant.charAt(0).toUpperCase() + variant.slice(1)}
							</Label>
							<Textarea
								id={`textarea-${variant}`}
								variant={variant}
								resize="vertical"
								placeholder={`This is a ${variant} textarea`}
							/>
						</Field>
					</Sizer>
				))}
			</Example>
			<Example title="Non-resizable">
				<Sizer>
					<Field>
						<Label htmlFor="textarea-non-resizable">Non-resizable</Label>
						<Textarea id="textarea-non-resizable" placeholder="Cannot resize" />
					</Field>
				</Sizer>
			</Example>
			<Example title="Auto resize">
				<Sizer>
					<Field>
						<Label htmlFor="textarea-auto-resize">Auto resize</Label>
						<Textarea
							id="textarea-auto-resize"
							autoResize
							rows={1}
							placeholder="Grows as you type"
						/>
					</Field>
				</Sizer>
			</Example>
			<Example title="With actions">
				<Sizer>
					<Field>
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
				</Sizer>
			</Example>
			<Example title="Invalid">
				<Sizer>
					<Field>
						<Label htmlFor="textarea-invalid">Invalid</Label>
						<Textarea
							id="textarea-invalid"
							data-invalid={true}
							placeholder="Something went wrong"
						/>
					</Field>
				</Sizer>
			</Example>
		</div>
	)
}
