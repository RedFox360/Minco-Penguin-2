import SlashCommand from "../core/SlashCommand.js";
import bsPokerRun from "../functions/bs_poker/bs_poker_run.js";

const bsPokerCommand = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("bs_poker_load")
			.setDescription(
				"Cards to out: 6; Begin cards: 2; Insurances: 2; All joker specials activated"
			)
	)
	.setCooldown(15)
	.setRun(async interaction => {
		await bsPokerRun(interaction, true);
	});

export default bsPokerCommand;
