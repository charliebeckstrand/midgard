import { Archive, ChevronDown, Copy, Download, Share2, SquarePen, Trash } from 'lucide-react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import {
	Menu,
	MenuContent,
	MenuDescription,
	MenuItem,
	MenuLabel,
	MenuSub,
	MenuText,
	MenuTrigger,
} from '../../../components/menu'
import { GlassProvider } from '../../../providers/glass'
import { Stack } from '../../../structure/stack'
import { Example } from '../../engine'

export function Demo() {
	const dropdown = (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Options
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>
					<MenuLabel>Edit</MenuLabel>
				</MenuItem>
				<MenuItem>
					<MenuLabel>Duplicate</MenuLabel>
				</MenuItem>
				<MenuItem>
					<MenuLabel>Archive</MenuLabel>
				</MenuItem>
				<MenuItem>
					<MenuLabel>Delete</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)

	const icons = (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Options
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>
					<Icon icon={<SquarePen />} />
					<MenuLabel>Edit</MenuLabel>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Copy />} />
					<MenuLabel>Duplicate</MenuLabel>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Archive />} />
					<MenuLabel>Archive</MenuLabel>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Trash />} />
					<MenuLabel>Delete</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)

	// MenuText stacks a label over its description, and the icon stays beside them.
	const stacked = (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Share
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>
					<Icon icon={<Copy />} />
					<MenuText>
						<MenuLabel>Copy link</MenuLabel>
						<MenuDescription>Anyone with the link can view</MenuDescription>
					</MenuText>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Download />} />
					<MenuText>
						<MenuLabel>Download</MenuLabel>
						<MenuDescription>Save a PDF copy</MenuDescription>
					</MenuText>
				</MenuItem>
				<MenuItem>
					<Icon icon={<Archive />} />
					<MenuText>
						<MenuLabel>Archive</MenuLabel>
						<MenuDescription>Hide it from the list</MenuDescription>
					</MenuText>
				</MenuItem>
			</MenuContent>
		</Menu>
	)

	const nested = (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="outline" suffix={<Icon icon={<ChevronDown />} />}>
					Options
				</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuItem>
					<Icon icon={<SquarePen />} />
					<MenuLabel>Edit</MenuLabel>
				</MenuItem>
				<MenuSub label="Share" icon={<Share2 />}>
					<MenuItem>
						<MenuLabel>Copy link</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Invite by email</MenuLabel>
					</MenuItem>
				</MenuSub>
				<MenuSub label="Export" icon={<Download />}>
					<MenuItem>
						<MenuLabel>Export to CSV</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Export to Excel</MenuLabel>
					</MenuItem>
				</MenuSub>
				<MenuItem>
					<Icon icon={<Trash />} />
					<MenuLabel>Delete</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	)

	return (
		<Stack gap="xl">
			<Example title="Default">{dropdown}</Example>

			<Example title="With icons">{icons}</Example>

			<Example title="Stacked text">{stacked}</Example>

			<Example title="Submenus">{nested}</Example>

			<Example title="Glass">
				<GlassProvider>{dropdown}</GlassProvider>
			</Example>
		</Stack>
	)
}
