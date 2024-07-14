export enum Element {
	Wind = "wind",
	Earth = "earth",
	Lightning = "lightning",
	Water = "water",
	Fire = "fire",
	Ice = "ice",
}

export interface Character {
	id: string;
	name: string;
	element: Element;
}

export const characters: Character[] = [
	{
		id: "000",
		name: "Penguin",
		element: Element.Water,
	},
	{
		id: "001",
		name: "Jonathan",
		element: Element.Wind,
	},
	{
		id: "002",
		name: "William's Oven",
		element: Element.Fire,
	},
];
