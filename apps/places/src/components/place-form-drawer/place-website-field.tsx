'use client'

import { ExternalLink } from 'lucide-react'
import { Button } from 'ui/button'
import { Field, Label, Message } from 'ui/fieldset'
import { useFormValue } from 'ui/form'
import { Icon } from 'ui/icon'
import { Input } from 'ui/input'
import { isWebsite } from '../../schemas/place'

/**
 * The website field. When the value is a website that can open, the suffix
 * holds a link that opens it in a new tab, so the reader can check the address
 * before they save it.
 *
 * The link is an anchor, so a tap opens the address the same as a click does.
 */
export function PlaceWebsiteField() {
	const { value = '' } = useFormValue<string>('url', {})

	const address = value.trim()

	return (
		<Field>
			<Label>Website</Label>

			<Input
				name="url"
				type="url"
				placeholder="https://"
				suffix={
					isWebsite(address) ? (
						<Button
							href={address}
							target="_blank"
							variant="bare"
							className="pointer-events-auto"
							aria-label="Open website"
						>
							<Icon icon={<ExternalLink />} />
						</Button>
					) : null
				}
			/>

			<Message name="url" />
		</Field>
	)
}
