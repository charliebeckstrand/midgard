import { File, Folder, Image, Music, Video } from 'lucide-react'
import { useState } from 'react'
import { Tree, TreeItem } from '../../../components/tree'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="Tree"
				omit={['mount']}
				render={(props, label) => (
					<Tree {...props} aria-label={label}>
						<TreeItem label="Documents" icon={<Folder />} defaultOpen>
							<TreeItem label="report.pdf" icon={<File />} />
							<TreeItem label="budget.xlsx" icon={<File />} />
						</TreeItem>
						<TreeItem label="Photos" icon={<Folder />}>
							<TreeItem label="vacation.jpg" icon={<Image />} />
						</TreeItem>
					</Tree>
				)}
			/>

			<Example title="Nested">
				<Tree aria-label="Project files">
					<TreeItem label="src" icon={<Folder />}>
						<TreeItem label="components" icon={<Folder />}>
							<TreeItem label="Button.tsx" icon={<File />} />
							<TreeItem label="Input.tsx" icon={<File />} />
						</TreeItem>
						<TreeItem label="hooks" icon={<Folder />}>
							<TreeItem label="useAuth.ts" icon={<File />} />
						</TreeItem>
						<TreeItem label="index.ts" icon={<File />} />
					</TreeItem>
				</Tree>
			</Example>

			<Example title="Rich content">
				<Tree aria-label="Media library">
					<TreeItem label="Media" icon={<Folder />}>
						<TreeItem label="Images" icon={<Image />}>
							<TreeItem label="photo-001.png" icon={<Image />} />
							<TreeItem label="photo-002.png" icon={<Image />} />
						</TreeItem>
						<TreeItem label="Music" icon={<Music />}>
							<TreeItem label="track-01.mp3" icon={<Music />} />
						</TreeItem>
						<TreeItem label="Videos" icon={<Video />}>
							<TreeItem label="clip.mp4" icon={<Video />} />
						</TreeItem>
					</TreeItem>
				</Tree>
			</Example>

			<Example title="Checkboxes">
				<CheckboxesExample />
			</Example>

			<Example title="Without icons">
				<Tree aria-label="Animal taxonomy">
					<TreeItem label="Animals">
						<TreeItem label="Mammals">
							<TreeItem label="Dog" />
							<TreeItem label="Cat" />
						</TreeItem>
						<TreeItem label="Birds">
							<TreeItem label="Eagle" />
							<TreeItem label="Sparrow" />
						</TreeItem>
					</TreeItem>
				</Tree>
			</Example>
		</>
	)
}

const sources = ['Button.tsx', 'Input.tsx', 'index.ts']

function CheckboxesExample() {
	const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(['Button.tsx']))

	// The caller holds each item, so it computes the state of the branch.
	const branch = picked.size === sources.length ? true : picked.size > 0 ? 'mixed' : false

	const pick = (name: string) => (checked: boolean) =>
		setPicked((prev) => {
			const next = new Set(prev)

			if (checked) next.add(name)
			else next.delete(name)

			return next
		})

	return (
		<Tree aria-label="Files to commit">
			<TreeItem
				label="src"
				icon={<Folder />}
				defaultOpen
				checked={branch}
				onCheckedChange={(checked) => setPicked(new Set(checked ? sources : []))}
			>
				{sources.map((name) => (
					<TreeItem
						key={name}
						label={name}
						icon={<File />}
						checked={picked.has(name)}
						onCheckedChange={pick(name)}
					/>
				))}
			</TreeItem>
		</Tree>
	)
}
