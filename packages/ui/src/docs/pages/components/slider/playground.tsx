import { Slider, type SliderProps } from 'ui/slider'

export default function SliderPlayground(props: SliderProps) {
	return <Slider aria-label="Volume" defaultValue={50} {...props} />
}
