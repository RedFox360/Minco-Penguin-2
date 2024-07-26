import SlashCommand from "../core/SlashCommand.js";
import bsPokerRun from "../functions/bs_poker/bs_poker_run.js";

export const optionNames = {
	cardsToOut: "cards_to_out",
	bet: "bet",
	commonCards: "common_cards",
	playerLimit: "player_limit",
	jokerCount: "joker_count",
	insuranceCount: "insurance_count",
	beginCards: "begin_cards",
	joinMidGame: "join_mid_game",
	specialCards: "special_cards",
	curses: "curses",
	nonstandard: "nonstandard",
	bloodJoker: "blood_joker",
	clown: "clown",
	bleed: "bleed",
} as const;

const bsPokerCommand = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("bs_poker")
			.setDescription("Play a game of BS Poker!")
			.addIntegerOption(option =>
				option
					.setName(optionNames.cardsToOut)
					.setDescription("Number of cards to get out")
					.setRequired(true)
					.setMinValue(2)
					.setMaxValue(15)
			)
			.addIntegerOption(option =>
				option
					.setName(optionNames.bet)
					.setDescription(
						"Every player must bet this to join the game, and the winner will take all. (Default: No bet)"
					)
					.setRequired(false)
					.setMinValue(10)
					.setMaxValue(2000)
			)
			.addIntegerOption(option =>
				option
					.setName(optionNames.commonCards)
					.setDescription(
						"Number of common cards (Default = median of each player's number of cards)"
					)
					.setRequired(false)
					.setMinValue(0)
					.setMaxValue(8)
			)
			.addIntegerOption(option =>
				option
					.setName(optionNames.playerLimit)
					.setDescription(
						"Player limit for the game (Default: maximum possible number)"
					)
					.setRequired(false)
					.setMinValue(2)
					.setMaxValue(15)
			)
			.addIntegerOption(option =>
				option
					.setName(optionNames.jokerCount)
					.setDescription("Number of jokers in the deck (Default: 2)")
					.setRequired(false)
					.setMinValue(0)
					.setMaxValue(4)
			)
			.addIntegerOption(option =>
				option
					.setName(optionNames.insuranceCount)
					.setDescription("Number of high wild cards in the deck (Default: 1)")
					.setRequired(false)
					.setMinValue(0)
					.setMaxValue(4)
			)
			.addIntegerOption(option =>
				option
					.setName(optionNames.beginCards)
					.setDescription(
						"Number of cards given to each player at the beginning (Default: 1)"
					)
					.setMinValue(1)
					.setMaxValue(8)
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.joinMidGame)
					.setDescription("Allow players to join mid-game (Default: True)")
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.specialCards)
					.setDescription(
						"/poker help Special Cards for more info (Default: False)"
					)
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.curses)
					.setDescription(
						"If the last 3 calls were false, the round ends and everyone gets a card. (Default: False)"
					)
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.nonstandard)
					.setDescription(
						"Allow triple pair, double flush, and double triple (Default: True)"
					)
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.bloodJoker)
					.setDescription(
						"If a player has a red joker during a curse, they lose a card. (Default: False)"
					)
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.clown)
					.setDescription(
						"Allow a player with a red joker to reverse the order of play. (Default: False)"
					)
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.bleed)
					.setDescription(
						"Allow each player to see one random card from the next player (Default: False)"
					)
					.setRequired(false)
			)
	)
	.setCooldown(15)
	.setRun(bsPokerRun);

export default bsPokerCommand;
