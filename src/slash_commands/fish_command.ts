import SlashCommand from "../core/SlashCommand";
import Fish from "../functions/fish/classes/Fish";

const fishCommand = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("fish")
			.setDescription("Play a game of fish (6 people required)")
	)
	.setCooldown(15)
	.setRun(async interaction => {
		const fishGame = new Fish();
	});

export default fishCommand;
