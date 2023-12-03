export default interface Toys {
	[name: string]: {
		name: string;
		emoji?: string;
		price: number;
		healthPoints: number;
	};
}
