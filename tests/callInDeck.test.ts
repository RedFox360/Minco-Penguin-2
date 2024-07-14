import { callInDeck } from "../src/functions/bs_poker/bs_poker_functions";
import { ExtCard, HandRank } from "../src/functions/bs_poker/bs_poker_types";

const deck: ExtCard[] = [
	{
		suit: "H",
		value: 6,
	},
	{
		suit: "H",
		value: 2,
	},
	{
		suit: "C",
		value: 6,
	},
	{
		suit: "C",
		value: 2,
	},
];
describe("call in deck", () => {
	test("double pair", () => {
		expect(callInDeck({ call: HandRank.DoublePair, high: [2, 6] }, deck)).toBe(
			true
		);
	});
});
