import SlashCommand from "../core/SlashCommand.js";
import { JICard } from "../functions/cards/basic_card_types.js";
import FishPlayer from "../functions/fish/classes/FishPlayer.js";
import fishHelp from "../functions/fish/fish_help.js";
import fishRun from "../functions/fish/fish_run.js";

const fishCommand = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("fish")
			.setDescription("Fish commands")
			.addSubcommand(fishRun.builder)
			.addSubcommand(fishHelp.builder)
	)
	.setCooldown(15)
	.setRun(async interaction => {
		switch (interaction.options.getSubcommand()) {
			case "run": {
				await fishRun.run(interaction);
				return;
			}
			case "help": {
				await fishHelp.run(interaction);
				return;
			}
		}
	});

export default fishCommand;
