import SlashCommand from "../core/SlashCommand.js";
import bsPokerRun from "../bs_poker/bs_poker_run.js";

const bsPokerCommand = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("bs_poker")
			.setDescription("Play a game of BS Poker!")
			.addIntegerOption(option =>
				option
					.setName("cards_to_out")
					.setDescription("Number of cards to be out")
					.setRequired(true)
					.setMinValue(2)
					.setMaxValue(15)
			)
			.addIntegerOption(option =>
				option
					.setName("common_cards")
					.setDescription(
						"Number of common cards (Default = median of each player's number of cards)"
					)
					.setRequired(false)
					.setMinValue(0)
					.setMaxValue(8)
			)
			.addIntegerOption(option =>
				option
					.setName("player_limit")
					.setDescription(
						"Player limit for the game (Default: maximum possible)"
					)
					.setRequired(false)
					.setMinValue(2)
					.setMaxValue(15)
			)
			.addIntegerOption(option =>
				option
					.setName("joker_count")
					.setDescription("Number of jokers in the deck (Default: 2)")
					.setRequired(false)
					.setMinValue(0)
					.setMaxValue(4)
			)
			.addIntegerOption(option =>
				option
					.setName("insurance_count")
					.setDescription("Number of high wild cards in the deck (Default: 1)")
					.setRequired(false)
					.setMinValue(0)
					.setMaxValue(4)
			)
			.addIntegerOption(option =>
				option
					.setName("begin_cards")
					.setDescription(
						"Number of cards given to each player at the beginning (Default: 1)"
					)
					.setMinValue(1)
					.setMaxValue(8)
					.setRequired(false)
			)
	)
	.setRun(bsPokerRun);

export default bsPokerCommand;
