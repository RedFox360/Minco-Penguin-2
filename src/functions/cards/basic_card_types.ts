import { type ExtCard } from "../bs_poker/bs_poker_types.js";

export type Suit = "H" | "D" | "C" | "S";
export type Value =
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11 // jack
	| 12 // queen
	| 13 // king
	| 14; // ace
export type JISuit = Suit | "j" | "i";
export type ExtValue = 1 | Value | 15;

export interface JICard {
	suit: JISuit;
	value: ExtValue;
}

export const suits = ["H", "D", "C", "S"] as const;
export const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

export interface Card {
	suit: Suit;
	value: Value;
}

export type AnyCard = Card | JICard | ExtCard;

export const emoji = {
	hearts: ":hearts:",
	diamonds: ":diamonds:",
	clubs: "<:clubst:1241960807005425768>",
	spades: "<:spadest:1241960808305659975>",
	joker: ":black_joker:",
	insurance: ":information_source:",
	clown: ":clown:",
} as const;

export const emojiRaw = {
	hearts: "♥️",
	diamonds: "♦️",
	clubs: "1241960807005425768",
	spades: "1241960808305659975",
	joker: "🃏",
	insurance: "ℹ️",
	clown: "🤡",
} as const;

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
] as const;

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
] as const;

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
} as const;

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
} as const;

export const symbolToValueObj: Record<string, ExtValue> = {
	joker: 1,
	x: 1,

	two: 2,
	deuce: 2,
	deux: 2,

	three: 3,
	trois: 3,

	four: 4,
	quatre: 4,

	five: 5,
	cinq: 5,

	six: 6,

	seven: 7,
	sept: 7,

	eight: 8,
	huit: 8,

	nine: 9,
	neuf: 9,

	ten: 10,
	t: 10,
	dix: 10,

	jack: 11,
	j: 11,
	knave: 11,
	valet: 11,

	queen: 12,
	q: 12,
	dame: 12,
	reine: 12,

	king: 13,
	k: 13,
	roi: 13,

	ace: 14,
	a: 14,
	as: 14,

	insurance: 15,
	i: 15,
	assurance: 15,
} as const;
