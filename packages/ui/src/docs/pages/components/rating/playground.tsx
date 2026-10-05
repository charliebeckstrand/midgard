import { Rating, type RatingProps } from 'ui/rating'

export default function RatingPlayground(props: RatingProps) {
	return <Rating aria-label="Your rating" defaultValue={3} {...props} />
}
