'use client'

import { Info } from 'lucide-react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { useFormActions } from 'ui/form'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'
import { Flex } from 'ui/structure/flex'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'

/**
 * The address field. A pick in the search fills it, and the reader can type it
 * for a place that the search does not find.
 *
 * An address that the reader types is the position from then on, so typing
 * clears the match in the search. A submit then finds the position from the
 * address. A match that stayed would put the place at the position of a
 * different address.
 *
 * The hint is in a tooltip on an info button beside the label, so that the form
 * stays short. On a touch screen, a tap on the button opens the tooltip. The
 * button takes the focus before the input, and a screen reader reads the hint
 * as the description of the button.
 */
export function PlaceAddressField() {
	const actions = useFormActions()

	return (
		<Field>
			<Flex gap="xs" align="center">
				<Label>Address</Label>

				<Tooltip>
					<TooltipTrigger>
						<Button type="button" variant="bare" aria-label="About the address">
							<Icon icon={<Info />} />
						</Button>
					</TooltipTrigger>

					<TooltipContent>
						Filled from the search. Type it if the search does not find the place.
					</TooltipContent>
				</Tooltip>
			</Flex>

			<Input
				name="address"
				autoComplete="street-address"
				placeholder="Street, city, state"
				onChange={() => actions?.setValue('place', undefined)}
			/>

			<Message name="address" />
		</Field>
	)
}
