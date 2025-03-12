import { APIEmbed, bold } from "discord.js";
import Subcommand from "../../core/Subcommand.js";
import { formatDeckSideways } from "../cards/basic_card_functions.js";
import { emoji } from "../cards/basic_card_types.js";
import { colors } from "../util.js";

const twoToSevenHalfSuit = bold(
	formatDeckSideways(
		[
			{ value: 2, suit: "H" },
			{ value: 3, suit: "H" },
			{ value: 4, suit: "H" },
			{ value: 5, suit: "H" },
			{ value: 6, suit: "H" },
			{ value: 7, suit: "H" },
		],
		true
	)
);
const ejiHalfSuit = bold(
	formatDeckSideways(
		[
			{ value: 8, suit: "H" },
			{ value: 8, suit: "D" },
			{ value: 8, suit: "C" },
			{ value: 8, suit: "S" },
			{ value: 1, suit: "j" },
			{ value: 15, suit: "i" },
		],
		true
	)
);
const nineToAceHalfSuit = bold(
	formatDeckSideways(
		[
			{ value: 9, suit: "S" },
			{ value: 10, suit: "S" },
			{ value: 11, suit: "S" },
			{ value: 12, suit: "S" },
			{ value: 13, suit: "S" },
			{ value: 14, suit: "S" },
		],
		true
	)
);
const exampleHand = bold(
	formatDeckSideways(
		[
			{ value: 4, suit: "D" },
			{ value: 5, suit: "S" },
			{ value: 1, suit: "j" },
			{ value: 13, suit: "C" },
			{ value: 12, suit: "D" },
			{ value: 2, suit: "D" },
			{ value: 6, suit: "S" },
			{ value: 10, suit: "C" },
			{ value: 4, suit: "H" },
		],
		true
	)
);

const helpEmbed: APIEmbed = {
	color: colors.blurple,
	title: "Fish Help & Rules",
	description: `Welcome to BS Poker! Here you can find information on how to play the game.
To start a game: use </fish:1341567199592190014>. If you enable \`shuffle_teams \`, the teams will be randomly shuffled before the game starts.
The host may type "abort" at any time to end an ongoing game.`,
	fields: [
		{
			name: "Cards",
			value: `Fish is a team game with 2 teams of 3 (6 total players). Each team's objective is to get points, and the first team get to 5 points wins. At the start of the game each player is dealt **9 cards** out of a 54 card deck. The deck consists of the standard deck, a joker, and an insurance. 
*Note: the "standard deck" consists of 4 suits: hearts, diamonds, clubs, and spades with 13 cards each (52 total cards).*`,
		},
		{
			name: "Half Suits",
			value: `The 54 cards are divided into **9 half-suits** with 6 cards each:
- The two to seven of each suit. (The "low hearts" suit is listed below.)
${twoToSevenHalfSuit}
- The eights, jokers, and insurances. 
${ejiHalfSuit}
- The nines to Aces of each suit. (The "high spades" suit is listed below.)
${nineToAceHalfSuit}`,
		},
		{
			name: "Asking for Cards (1)",
			value: `The player with the Ace${emoji.spades} always begins the game. On your turn, you may ask another player for a card that
1. you do not already have, *and*
2. is in the same half-suit as one of your cards.
On your turn, you may ask another player for a card that you don't have but is in the same half-suit as one of your cards. For example, suppose you have 
${exampleHand}
Then, you may ask another player for 8:diamonds: on your turn, because you don't have 8:diamonds: but have :joker:, which is in the same half-suit as 8:diamonds:. 
You may **not** ask someone for the King:hearts:, since you do not have any cards in the "high hearts" half-suit.`,
		},
		{
			name: "Asking for Cards & Turns (2)",
			value: `If the player you ask has that card, they give it to you and it remains your turn. If they do *not* have that card, it is now their turn.
If at any point in the game you have 0 cards, you cannot be asked anymore.
If you get asked for a card that you have, you must give your card to them. However, if you get asked for a card that you don't have, it is now your turn. If at any point in the game you have 0 cards, you cannot be asked anymore.`,
		},
		{
			name: "Calling Half Suits",
			value: `To make a **half-suit call**, a player must announce the members of their team who have each card in a half suit. For example, a player might say "I have the 2:hearts:, teammate 1 has the 3:hearts: and 6:hearts:, and teammate 2 has the 4:hearts:, 5:hearts:, and 7:hearts:. This is a call for the **low hearts** half suit. 
:green_circle: If you are correct, your team **gains a point** and the cards in the half suit are put on your team's "table" (they are out of play).
:red_circle: If you are incorrect, the **other team gets a point** and the cards in the half suit are put on the other team's "table."`,
		},
		{
			name: "Disjoint & Turn Passing",
			value: `At any point in the game, a player may **call disjoint** with someone on the other team. To call disjoint with someone, you show them your cards, and they will take any and all cards that are in the same half-suit as any of their cards. Once two players are disjoint, they may no longer ask each other for cards.
If at any point a player does not have any valid plays (i.e. it is their turn, but they are disjoint with everyone on the other team), the turn will pass randomly to someone on their team who can make a valid call. 
If no one can ask anyone else, but people still have cards, both teams are completely disjoint from each other. All half-suits are restricted to only one team, so the teams may only **call** half-suits.`,
		},
		{
			name: "Button Info",
			value: `If you click the "View Cards" button, you will receive a private message with your cards.
If you click the "Table" button, you will see a list of players, and the half suits that each team has earned. If a team has only 1 half suit, all the cards in the half suit will be displayed. If it has more than 1, only *one card* of each half suit will be displayed.`,
		},
	],
	footer: {
		text: "Rules written by @deltarail | Bot made by @obvsam",
		icon_url:
			"https://cdn.discordapp.com/avatars/761087796264960010/a7e4148f9ebba308ee73725381b0772a.webp",
	},
};

const FishHelp = new Subcommand()
	.setCommandData(builder =>
		builder
			.setName("help")
			.setDescription("Get information on how to play Fish.")
	)
	.setRun(async interaction => {
		await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
	});

export default FishHelp;
