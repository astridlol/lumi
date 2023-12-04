export default interface Toys {
	[name: string]: {
		name: string;
		emoji?: string;
		price: number;
		happiness: number;
	};
}
