import { Fragment } from 'react'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import { Flex } from 'ui/flex'
import { useIntl } from 'ui/primitives/intl'
import { Rating } from 'ui/rating'
import { Text } from 'ui/text'
import { restaurants } from './restaurants.ts'

export default function ReadOnly() {
	const intl = useIntl()

	return (
		<DescriptionList>
			{restaurants.map((place) => (
				<Fragment key={place.name}>
					<DescriptionTerm>{place.name}</DescriptionTerm>
					<DescriptionDetails>
						<Flex gap="sm" align="center">
							<Rating readOnly value={place.score} />
							<Text>
								{intl.formatNumber(place.score, {
									minimumFractionDigits: 1,
									maximumFractionDigits: 1,
								})}
							</Text>
						</Flex>
					</DescriptionDetails>
				</Fragment>
			))}
		</DescriptionList>
	)
}
