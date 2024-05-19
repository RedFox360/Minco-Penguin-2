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
					.setMaxValue(8)
			)
			.addIntegerOption(option =>
				option
					.setName("player_limit")
					.setDescription("Player limit for the game (Default: 10)")
					.setRequired(false)
					.setMinValue(2)
					.setMaxValue(20)
			)
	)
	.setRun(bsPokerRun);

export default bsPokerCommand;
