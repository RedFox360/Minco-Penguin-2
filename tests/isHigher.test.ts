import { isHigher } from "../src/functions/bs_poker/bs_poker_functions";
import { HandRank, ExtValue } from "../src/functions/bs_poker/bs_poker_types";
import { oneCallsToTest } from "./util_types";

const calls = [
	HandRank.High,
	HandRank.Pair,
	HandRank.DoublePair,
	HandRank.TriplePair,
	HandRank.Triple,
	HandRank.Straight,
	HandRank.Flush,
	HandRank.DoubleFlush,
	HandRank.FullHouse,
	HandRank.DoubleTriple,
	HandRank.Quad,
	HandRank.StraightFlush,
];

const h = null as any;
describe("across calls of different ranks", () => {
	test("lower ranked calls return false, higher return true", () => {
		calls.forEach(call1 => {
			calls.forEach(call2 => {
				if (call1 === call2) return;
				const result = isHigher(
					{
						call: call1,
						high: h,
					},
					{
						call: call2,
						high: h,
					}
				);
				if (call1 < call2) {
					expect(result).toBe(false);
				} else {
					expect(result).toBe(true);
				}
			});
		});
	});
});

describe("parse one call", () => {
	oneCallsToTest.forEach(call => {
		test(`parsing ${call[0][0]}`, () => {
			for (let i = 1; i <= 15; i++) {
				for (let j = 1; j <= 15; j++) {
					const result = isHigher(
						{
							call: call[1],
							high: {
								value: i as ExtValue,
								suit: h,
							},
						},
						{
							call: call[1],
							high: {
								value: j as ExtValue,
								suit: h,
							},
						}
					);
					if (i > j) {
						expect(result).toBe(true);
					} else {
						expect(result).toBe(false);
					}
				}
			}
		});
	});
});
