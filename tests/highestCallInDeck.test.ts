import {
	callInDeck,
	highestCallInDeck,
} from "../src/functions/bs_poker/bs_poker_functions";
import {
	ExtCard,
	Call,
	HandRank,
} from "../src/functions/bs_poker/bs_poker_types";
import BSPokerPlayer from "../src/functions/bs_poker/classes/Player";
import PlayerCollection from "../src/functions/bs_poker/classes/PlayerCollection";
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
	{ suit: "C", value: 2 },
	{ suit: "S", value: 7 },
	{ suit: "C", value: 14 },
	{ suit: "C", value: 3 },
	{ suit: "S", value: 3 },
	{ suit: "S", value: 4 },
	{ suit: "H", value: 12 },
	{ suit: "bj", value: 1 },
	{ suit: "D", value: 6 },
	{ suit: "S", value: 8 },
	{ suit: "H", value: 13 },
	{ suit: "H", value: 6 },
	{ suit: "D", value: 9 },
	{ suit: "D", value: 14 },
	{ suit: "i", value: 15 },
];

describe("highest call", () => {
	test("highest call 2", async () => {
		const result = await highestCallInDeck(exampleDeck2, true, 0);
		expect(result).toEqual({
			call: HandRank.DoubleFlush,
			high: [
				{
					value: 7,
					suit: "S",
				},
				{
					value: 15,
					suit: "H",
				},
			],
		});
	});
});
