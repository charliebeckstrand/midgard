import { Info } from 'lucide-react'
import { Field, Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { IconButton } from 'ui/icon-button'
import { Input } from 'ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function LabelWithHint() {
	return (
		<Field>
			<Flex gap="xs" align="center">
				<Label>Address</Label>
				<Tooltip trigger="click">
					<TooltipTrigger>
						<IconButton size="sm" aria-label="About the address" icon={<Info />} />
					</TooltipTrigger>
					<TooltipContent>Type the street, the city, and the state.</TooltipContent>
				</Tooltip>
			</Flex>
			<Input placeholder="Street, city, state" />
		</Field>
	)
}
