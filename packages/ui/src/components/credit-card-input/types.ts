export type CreditCardBrand =
	| 'visa'
	| 'mastercard'
	| 'amex'
	| 'discover'
	| 'diners'
	| 'jcb'
	| 'unionpay'

export type CreditCardBrandInfo = {
	brand: CreditCardBrand
	label: string
	lengths: number[]
	gaps: number[]
	cvvLength: number
}
