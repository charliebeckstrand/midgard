import { Fragment } from 'react'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import { Flex } from 'ui/flex'
import { Rating } from 'ui/rating'
import { Text } from 'ui/text'

const places = [
	{ name: 'Harbor Kitchen', score: 4.8 },
	{ name: 'Blue Door Cafe', score: 4.2 },
	{ name: 'Corner Burger', score: 3.5 },
	{ name: 'Night Market Grill', score: 2.1 },
]

export default function ReviewAverages() {
	return (
		<DescriptionList>
			{places.map((place) => (
				<Fragment key={place.name}>
					<DescriptionTerm>{place.name}</DescriptionTerm>
					<DescriptionDetails>
						<Flex gap="sm" align="center">
							<Rating readOnly value={place.score} />
							<Text>{place.score.toFixed(1)}</Text>
						</Flex>
					</DescriptionDetails>
				</Fragment>
			))}
		</DescriptionList>
	)
}
