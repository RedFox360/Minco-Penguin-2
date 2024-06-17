import { ExtValue } from "../src/functions/bs_poker/bs_poker_types.js";
import { parseCall } from "../src/functions/bs_poker/bs_poker_functions.js";
import { HandRank } from "../src/functions/bs_poker/bs_poker_types.js";
import {
	flushesToTest,
	oneCallsToTest,
	pairNames,
	straightFlushesToTest,
	tripleNames,
	twoCallsToTest,
} from "./util_types.js";

const values: [string, ExtValue][] = [
	["x", 1],
	["joker", 1],
	["i", 15],
	["insurance", 15],
	["a", 14],
	["k", 13],
	["q", 12],
	["j", 11],
	["ace", 14],
	["king", 13],
	["queen", 12],
	["jack", 11],
];

for (let i = 1; i <= 15; i++) {
	values.push([i.toString(), i as ExtValue]);
}
describe("parse one call", () => {
	oneCallsToTest.forEach(call => {
		const testName = `parse ${call[0][0]}`;
		test(testName, () => {
			call[0].forEach(name => {
				values.forEach(val => {
					const callToParse = `${val[0]} ${name}`;
					expect(parseCall(callToParse)).toEqual({
						high: {
							value: val[1],
							suit: null,
						},
						call: call[1],
					});
				});
			});
		});
	});
});

describe("parse flushes", () => {
	flushesToTest.forEach(flush => {
		const testName = `parse flush ${flush[1]}`;
		test(testName, () => {
			flush[0].forEach(name => {
				values.forEach(val => {
					const callToParse = `${val[0]} ${name}`;
					expect(parseCall(callToParse)).toEqual({
						high: {
							value: val[1],
							suit: flush[1],
						},
						call: HandRank.Flush,
					});
				});
			});
		});
	});
});

describe("parse double flush", () => {
	flushesToTest.forEach(flush1 => {
		flushesToTest.forEach(flush2 => {
			const testName = `parse double flush ${flush1[1]} ${flush2[1]}`;
			test(testName, () => {
				flush1[0].forEach(name => {
					flush2[0].forEach(name2 => {
						values.forEach(val1 => {
							values.forEach(val2 => {
								const callToParse = `${val1[0]} ${name} ${val2[0]} ${name2}`;
								expect(parseCall(callToParse)).toEqual({
									high: [
										{
											value: val1[1],
											suit: flush1[1],
										},
										{
											value: val2[1],
											suit: flush2[1],
										},
									],
									call: HandRank.DoubleFlush,
								});
							});
						});
					});
				});
			});
		});
	});
});

describe("parse straight flushes", () => {
	straightFlushesToTest.forEach(flush => {
		const testName = `parse straight flush ${flush[1]}`;
		test(testName, () => {
			flush[0].forEach(name => {
				values.forEach(val => {
					const callToParse = `${val[0]} ${name}`;
					expect(parseCall(callToParse)).toEqual({
						high: {
							value: val[1],
							suit: flush[1],
						},
						call: HandRank.StraightFlush,
					});
				});
			});
		});
	});
});

describe("parse two calls", () => {
	twoCallsToTest.forEach(call => {
		const testName = `parse ${call[0][0]}`;
		test(testName, () => {
			call[0].forEach(name => {
				values.forEach(val1 => {
					values.forEach(val2 => {
						const callToParse = `${val1[0]} ${name} ${val2[0]} ${name}`;
						expect(parseCall(callToParse)).toEqual({
							high: [val1[1], val2[1]],
							call: call[1],
						});
					});
				});
			});
		});
	});

	test("parse full house", () => {
		values.forEach(val1 => {
			values.forEach(val2 => {
				pairNames.forEach(pairName => {
					tripleNames.forEach(tripleName => {
						const tripleFirst = parseCall(
							`${val1[0]} ${tripleName} ${val2[0]} ${pairName}`
						);
						const pairFirst = parseCall(
							`${val2[0]} ${pairName} ${val1[0]} ${tripleName}`
						);
						expect(tripleFirst).toEqual(pairFirst);
						expect(tripleFirst).toEqual({
							high: [val1[1], val2[1]],
							call: HandRank.FullHouse,
						});
					});
				});
			});
		});
	});
});

describe("parse three calls", () => {
	test("parse triple pair", () => {
		values.forEach(val1 => {
			values.forEach(val2 => {
				values.forEach(val3 => {
					pairNames.forEach(pairName => {
						const callToParse = `${val1[0]} ${pairName} ${val2[0]} ${pairName} ${val3[0]} ${pairName}`;
						expect(parseCall(callToParse)).toEqual({
							high: [val1[1], val2[1], val3[1]],
							call: HandRank.TriplePair,
						});
					});
				});
			});
		});
	});
});
