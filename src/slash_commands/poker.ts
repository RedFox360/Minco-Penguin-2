import SlashCommand from "../core/SlashCommand.js";
import pokerHelp from "../functions/bs_poker/poker_help.js";
import pokerStats from "../functions/bs_poker/poker_stats.js";

const poker = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("poker")
			.setDescription("BS Poker additional commands")
			.addSubcommand(pokerHelp.builder)
			.addSubcommand(pokerStats.builder)
	)
	.setRun(async interaction => {
		switch (interaction.options.getSubcommand()) {
			case "help":
				pokerHelp.run(interaction);
				return;
			case "stats":
				pokerStats.run(interaction);
				return;
		}
	});

export default poker;
