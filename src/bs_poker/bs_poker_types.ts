import { Collection, Snowflake } from "discord.js";

export type StrictSuit = "H" | "D" | "C" | "S";
export type Suit = StrictSuit | "j" | "i" | "n" | "bj" | "rj";
// bj = black joker (take a common card)
// rj = red joker (cross bs-ing = -1 card)

export type Value =
	| 0
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15;

export interface Card {
	suit: Suit;
	value: Value;
}

export type Deck = Card[];

export enum HandRank {
	High = 0,
	Pair = 1,
	DoublePair = 2,
	TriplePair = 3,
	Triple = 4,
	Straight = 5,
	Flush = 6,
	FlushMax = Flush + 3, // 9
	DoubleFlush = 10,
	FullHouse = 11,
	DoubleTriple = 12,
	Quad = 13,
	StraightFlush = 14,
	StraightFlushMax = StraightFlush + 3, // 17
}

export const RNI = {
	[HandRank.High]: 0,
	[HandRank.Pair]: 1,
	[HandRank.Triple]: 2,
	[HandRank.Straight]: 3,
	[HandRank.Flush]: 4, // Hearts
	[HandRank.Flush + 1]: 5, // Diamonds
	[HandRank.Flush + 2]: 6, // Clubs
	[HandRank.FlushMax]: 7, // Spades
	[HandRank.Quad]: 8,
	[HandRank.StraightFlush]: 9, // Hearts
	[HandRank.StraightFlush + 1]: 10, // Diamonds
	[HandRank.StraightFlush + 2]: 11, // Clubs
	[HandRank.StraightFlushMax]: 12, // Spades
};

export const RNIKeys = Object.keys(RNI).map(n => parseInt(n));

export type Call = OneCall | TwoCall | ThreeCall | DoubleFlushCall;

interface OneCall {
	high: Card;
	call: HandRank;
}
interface TwoCall {
	high: [Value, Value];
	call: HandRank.DoublePair | HandRank.FullHouse | HandRank.DoubleTriple;
}
interface ThreeCall {
	high: [Value, Value, Value];
	call: HandRank.TriplePair;
}
export interface DoubleFlushCall {
	high: [Card, Card];
	call: HandRank.DoubleFlush;
}

export type PlayerHands = Collection<Snowflake, Deck>;

export const names = [
	["high", "high card", "h"],
	["pair", "double", "p", "d"],
	["triple", "t"],
	["high straight", "straight", "s"],
	[
		"high flush:hearts:",
		"flush:hearts:",
		"flush hearts",
		"hearts flush",
		"high hearts flush",
		"high flush hearts",
		"fh",
		"hf",
	],
	[
		"high flush:diamonds:",
		"flush:diamonds:",
		"flush diamonds",
		"diamonds flush",
		"high diamonds flush",
		"high flush diamonds",
		"fd",
		"df",
	],
	[
		"high flush<:clubst:1241960807005425768>",
		"flush<:clubst:1241960807005425768>",
		"flush clubs",
		"clubs flush",
		"high clubs flush",
		"high flush clubs",
		"fc",
		"cf",
	],
	[
		"high flush<:spadest:1241960808305659975>",
		"flush<:spadest:1241960808305659975>",
		"flush spades",
		"spades flush",
		"high spades flush",
		"high flush spades",
		"fs",
		"sf",
	],
	["quad", "q"],
	[
		"high straight flush:hearts:",
		"straight flush:hearts:",
		"straight flush hearts",
		"hearts straight flush",
		"high hearts straight flush",
		"high straight flush hearts",
		"sfh",
		"hsf",
	],
	[
		"high straight flush:diamonds:",
		"straight flush:diamonds:",
		"straight flush diamonds",
		"diamonds straight flush",
		"high diamonds straight flush",
		"high straight flush diamonds",
		"sfd",
		"dsf",
	],
	[
		"high straight flush<:clubst:1241960807005425768>",
		"straight flush<:clubst:1241960807005425768>",
		"straight flush clubs",
		"clubs straight flush",
		"high clubs straight flush",
		"high straight flush clubs",
		"sfc",
		"csf",
	],
	[
		"high straight flush<:spadest:1241960808305659975>",
		"straight flush<:spadest:1241960808305659975>",
		"straight flush spades",
		"spades straight flush",
		"high spades straight flush",
		"high straight flush spades",
		"sfs",
		"ssf",
	],
];

export type PlayerCall = {
	call: Call;
	player: Snowflake;
};

export const emoji = {
	hearts: ":hearts:",
	diamonds: ":diamonds:",
	clubs: "<:clubst:1241960807005425768>",
	spades: "<:spadest:1241960808305659975>",
	joker: ":black_joker:",
	insurance: ":information_source:",
};

export const emojiRaw = {
	hearts: "❤️",
	diamonds: "♦️",
	clubs: "1241960807005425768",
	spades: "1241960808305659975",
	joker: "🃏",
	insurance: "ℹ️",
};

export const newEmoji = [
	["<:2_black:1244136325570101348>", "<:2_red:1244136346889486386>"],
	["<:3_black:1244136405270138963>", "<:3_red:1244136326392053892>"],
	["<:4_black:1244136370549555251>", "<:4_red:1244136347841859586>"],
	["<:5_black:1244136432772059196>", "<:5_red:1244136384743211059>"],
	["<:6_black:1244136345887047751>", "<:6_red:1244136344825888778>"],
	["<:7_black:1244136323887927319>", "<:7_red:1244136403152011384>"],
	["<:8_black:1244136369408970863>", "<:8_red:1244136430238957649>"],
	["<:9_black:1244136431522287667>", "<:9_red:1244136368209264692>"],
	["<:10_black:1244136387289284672>", "<:10_red:1244136328002801814>"],
	["<:j_black:1244136386349764628>", "<:j_red:1244136433451532320>"],
	["<:q_black:1244136434852429917>", "<:q_red:1244136428385075241>"],
	["<:k_black:1244136365629771806>", "<:k_red:1244136404037013515>"],
	["<:a_black:1244136402157830175>", "<:a_red:1244136389050896445>"],
];

export const newEmojiRaw = [
	["1244136325570101348", "1244136346889486386"],
	["1244136405270138963", "1244136326392053892"],
	["1244136370549555251", "1244136347841859586"],
	["1244136432772059196", "1244136384743211059"],
	["1244136345887047751", "1244136344825888778"],
	["1244136323887927319", "1244136403152011384"],
	["1244136369408970863", "1244136430238957649"],
	["1244136431522287667", "1244136368209264692"],
	["1244136387289284672", "1244136328002801814"],
	["1244136386349764628", "1244136433451532320"],
	["1244136434852429917", "1244136428385075241"],
	["1244136365629771806", "1244136404037013515"],
	["1244136402157830175", "1244136389050896445"],
];

export const newEmojiSuits = {
	hearts: "<:hearts_suit:1244136297208090644>",
	diamonds: "<:diamonds_suit:1244136300613730325>",
	clubs: "<:clubs_suit:1244136298370039909>",
	spades: "<:spades_suit:1244136299632394241>",
	black: "<:black_bottom:1244490512174551061>",
	red: "<:red_bottom:1244490511008534699>",
	joker: "<:joker2:1244491617927434251>",
	insurance: "<:insurance:1244490235929165954>",
	blankBottom: "<:blank_bottom:1244485668462399529>",
	blankTop: "<:blank_top:1244485669594726400>",
};

export const newEmojiSuitsRaw = {
	hearts: "1244136297208090644",
	diamonds: "1244136300613730325",
	clubs: "1244136298370039909",
	spades: "1244136299632394241",
	black: "1244490512174551061",
	red: "1244490511008534699",
	joker: "1244491617927434251",
	insurance: "1244490235929165954",
	blankBottom: "1244485668462399529",
	blankTop: "1244485669594726400",
};
