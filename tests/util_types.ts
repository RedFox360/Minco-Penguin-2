import {
	HandRank,
	RNI,
	names,
} from "../src/functions/bs_poker/bs_poker_types.js";

export const oneCallsToTest = [
	[names[RNI[HandRank.High]], HandRank.High],
	[names[RNI[HandRank.Pair]], HandRank.Pair],
	[names[RNI[HandRank.Triple]], HandRank.Triple],
	[names[RNI[HandRank.Straight]], HandRank.Straight],
	[names[RNI[HandRank.Quad]], HandRank.Quad],
] as const;

export const flushesToTest = [
	[names[RNI[HandRank.Flush]], "H"],
	[names[RNI[HandRank.Flush + 1]], "D"],
	[names[RNI[HandRank.Flush + 2]], "C"],
	[names[RNI[HandRank.FlushMax]], "S"],
] as const;

export const straightFlushesToTest = [
	[names[RNI[HandRank.StraightFlush]], "H"],
	[names[RNI[HandRank.StraightFlush + 1]], "D"],
	[names[RNI[HandRank.StraightFlush + 2]], "C"],
	[names[RNI[HandRank.StraightFlushMax]], "S"],
] as const;

export const pairNames = names[RNI[HandRank.Pair]];
export const tripleNames = names[RNI[HandRank.Triple]];
export const twoCallsToTest = [
	[pairNames, HandRank.DoublePair],
	[tripleNames, HandRank.DoubleTriple],
] as const;
