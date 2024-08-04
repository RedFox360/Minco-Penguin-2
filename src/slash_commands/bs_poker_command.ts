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
	useSpecials: "special_cards",
	bloodJoker: "blood_joker",
	bleedJoker: "bleed_joker",
	clownJoker: "clown_joker",
	curses: "curses",
	nonstandard: "nonstandard",
	insuranceSpecials: "insurance_specials",
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
			.addBooleanOption(option =>
				option
					.setName(optionNames.useSpecials)
					.setDescription(
						"Use special cards (/poker help Special Cards for more info) (Default: False)"
					)
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.bloodJoker)
					.setDescription("Use blood joker (Default: False)")
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.bleedJoker)
					.setDescription("Use bleed joker (Default: False)")
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.clownJoker)
					.setDescription("Use clown joker (Default: False)")
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.curses)
					.setDescription(
						"If the last 3 calls are false, the round will end and everyone will get a card. (Default: False)"
					)
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName(optionNames.insuranceSpecials)
					.setDescription(
						"Duplicate each special card (one is a joker and one is insurance) (Default: False)"
					)
					.setRequired(false)
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
					.setName(optionNames.nonstandard)
					.setDescription(
						"Allow triple pair, double flush, and double triple (Default: True)"
					)
					.setRequired(false)
			)
	)
	.setCooldown(15)
	.setRun(bsPokerRun);

export default bsPokerCommand;
