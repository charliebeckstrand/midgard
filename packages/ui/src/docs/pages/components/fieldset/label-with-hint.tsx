import { Info } from 'lucide-react'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

export default function LabelWithHint() {
	return (
		<Field>
			<Flex gap="xs" align="center">
				<Label>Address</Label>
				<Tooltip trigger="click">
					<TooltipTrigger>
						<Button type="button" variant="bare" size="sm" aria-label="About the address">
							<Icon icon={<Info />} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Type the street, the city, and the state.</TooltipContent>
				</Tooltip>
			</Flex>
			<Input placeholder="Street, city, state" />
		</Field>
	)
}
