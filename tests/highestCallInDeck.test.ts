import {
	callInDeck,
	highestCallInDeck,
} from "../src/functions/bs_poker/bs_poker_functions";
import {
	ExtCard,
	Call,
	HandRank,
} from "../src/functions/bs_poker/bs_poker_types";
import { countInArray } from "../src/functions/util";

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

const exampleDeck2: ExtCard[] = [
	{ value: 1, suit: "j" },
	{ value: 4, suit: "H" },
	{ value: 10, suit: "C" },
	{ value: 2, suit: "C" },
	{ value: 2, suit: "H" },
	{ value: 10, suit: "H" },
	{ value: 10, suit: "S" },
	{ value: 7, suit: "S" },
	{ value: 7, suit: "D" },
	{ value: 10, suit: "D" },
];

describe("10 quad", () => {
	test("test count", () => {
		expect(
			countInArray(exampleDeck2, x => x.value === 10)
		).toBeGreaterThanOrEqual(4);
	});
	test("10 quad", () => {
		const call: Call = {
			call: HandRank.Quad,
			high: {
				value: 10,
				suit: null,
			},
		};

		expect(callInDeck(call, exampleDeck2)).toBe(true);
	});
});
