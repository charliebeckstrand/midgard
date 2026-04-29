'use client'

import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Italic,
	Redo,
	Strikethrough,
	Underline,
	Undo,
} from 'lucide-react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

function FormattingToolbar() {
	return (
		<Toolbar aria-label="Text formatting">
			<ToolbarGroup aria-label="History">
				<Button
					variant="plain"
					aria-label="Undo"
					aria-pressed={false}
					prefix={<Icon icon={<Undo />} />}
				/>
				<Button
					variant="plain"
					aria-label="Redo"
					aria-pressed={false}
					prefix={<Icon icon={<Redo />} />}
				/>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Marks">
				<Button
					variant="plain"
					aria-label="Bold"
					aria-pressed={false}
					prefix={<Icon icon={<Bold />} />}
				/>
				<Button
					variant="plain"
					aria-label="Italic"
					aria-pressed={false}
					prefix={<Icon icon={<Italic />} />}
				/>
				<Button
					variant="plain"
					aria-label="Underline"
					aria-pressed={false}
					prefix={<Icon icon={<Underline />} />}
				/>
				<Button
					variant="plain"
					aria-label="Strikethrough"
					aria-pressed={false}
					prefix={<Icon icon={<Strikethrough />} />}
				/>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Alignment">
				<Button
					variant="plain"
					aria-label="Align left"
					aria-pressed={false}
					prefix={<Icon icon={<AlignLeft />} />}
				/>
				<Button
					variant="plain"
					aria-label="Align center"
					aria-pressed={false}
					prefix={<Icon icon={<AlignCenter />} />}
				/>
				<Button
					variant="plain"
					aria-label="Align right"
					aria-pressed={false}
					prefix={<Icon icon={<AlignRight />} />}
				/>
			</ToolbarGroup>
		</Toolbar>
	)
}

export default function ToolbarDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<FormattingToolbar />
			</Example>

			<Example title="Variants">
				<Stack gap={4}>
					<Toolbar variant="outline" aria-label="File actions">
						<Button variant="plain" aria-label="New">
							New
						</Button>
						<Button variant="plain" aria-label="Open">
							Open
						</Button>
						<ToolbarSeparator />
						<Button variant="plain" aria-label="Save">
							Save
						</Button>
						<Button variant="plain" aria-label="Export">
							Export
						</Button>
					</Toolbar>

					<Toolbar variant="solid" aria-label="Clipboard">
						<Button variant="plain" aria-label="Copy">
							Copy
						</Button>
						<Button variant="plain" aria-label="Cut">
							Cut
						</Button>
						<Button variant="plain" aria-label="Paste">
							Paste
						</Button>
					</Toolbar>
				</Stack>
			</Example>

			<Example title="Vertical">
				<Toolbar orientation="vertical" variant="outline" aria-label="Tools">
					<Button
						variant="plain"
						aria-label="Bold"
						aria-pressed={false}
						prefix={<Icon icon={<Bold />} />}
					/>
					<Button
						variant="plain"
						aria-label="Italic"
						aria-pressed={false}
						prefix={<Icon icon={<Italic />} />}
					/>
					<Button
						variant="plain"
						aria-label="Underline"
						aria-pressed={false}
						prefix={<Icon icon={<Underline />} />}
					/>
					<ToolbarSeparator />
					<Button
						variant="plain"
						aria-label="Align left"
						aria-pressed={false}
						prefix={<Icon icon={<AlignLeft />} />}
					/>
					<Button
						variant="plain"
						aria-label="Align center"
						aria-pressed={false}
						prefix={<Icon icon={<AlignCenter />} />}
					/>
					<Button
						variant="plain"
						aria-label="Align right"
						aria-pressed={false}
						prefix={<Icon icon={<AlignRight />} />}
					/>
				</Toolbar>
			</Example>
		</Stack>
	)
}
