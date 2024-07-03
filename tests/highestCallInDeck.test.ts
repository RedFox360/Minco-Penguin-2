import { highestCallInDeck } from "../src/functions/bs_poker/bs_poker_functions";
import { ExtCard, HandRank } from "../src/functions/bs_poker/bs_poker_types";

const exampleDeck: ExtCard[] = [
	{
		value: 2,
		suit: "H",
	},
	{
		value: 3,
		suit: "C",
	},
	{ value: 4, suit: "D" },
	{ value: 5, suit: "S" },
	{ value: 6, suit: "H" },
	{ value: 7, suit: "C" },
	{ value: 8, suit: "D" },
];

describe("highest call in deck", () => {
	test("highest call in deck is straight flush", async () => {
		const result = await highestCallInDeck(exampleDeck, true, 1);
		expect(result).toEqual({
			call: HandRank.Straight,
			high: {
				value: 8,
				suit: null,
			},
		});
	});
});
