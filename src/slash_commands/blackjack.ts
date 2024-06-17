import SlashCommand from "../core/SlashCommand.js";
import Blackjack from "../functions/blackjack/blackjack_class.js";
import { getProfile } from "../prisma/models.js";

const blackjackCommand = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("blackjack")
			.setDescription("Play blackjack in the Minco casino!")
			.addIntegerOption(option =>
				option
					.setName("bet")
					.setDescription("The amount of MD you want to bet")
					.setMinValue(25)
					.setMaxValue(250)
					.setRequired(true)
			)
	)
	.setCooldown(10)
	.setRun(async interaction => {
		const bet = interaction.options.getInteger("bet");
		const profile = await getProfile(interaction.user.id);
		if (profile.mincoDollars < bet) {
			return interaction.reply({
				content: `You don't have **${bet}** Minco Dollars.`,
				ephemeral: true,
			});
		}
		await interaction.deferReply();
		const game = new Blackjack(interaction, bet);
		game.gameLogic();
	});

export default blackjackCommand;
