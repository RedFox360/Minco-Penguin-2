import { SlashCommandIntegerOption } from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import Blackjack from "../functions/blackjack/blackjack_class.js";
import { getProfile } from "../prisma/models.js";

const betOption = new SlashCommandIntegerOption()
	.setName("bet")
	.setDescription("The amount of MD you want to bet")
	.setMinValue(5)
	.setMaxValue(250)
	.setRequired(true);

const blackjackCommand = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("blackjack")
			.setDescription("Play blackjack in the Minco casino!")
			.addSubcommand(subcommand =>
				subcommand
					.setName("start")
					.setDescription(
						"Start 1 game of blackjack in the Minco casino! (Blackjack pays 3:2)"
					)
					.addIntegerOption(betOption)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName("session")
					.setDescription(
						"Start a blackjack session in the Minco casino! (Blackjack pays 3:2)"
					)
					.addIntegerOption(betOption)
					.addIntegerOption(option =>
						option
							.setName("rounds")
							.setDescription("The number of rounds you want to play")
							.setMinValue(5)
							.setMaxValue(15)
							.setRequired(true)
					)
			)
	)
	.setCooldown(10)
	.setRun(async interaction => {
		const isSession = interaction.options.getSubcommand() === "session";
		const rounds = isSession ? interaction.options.getInteger("rounds") : null;
		const bet = interaction.options.getInteger("bet");
		const profile = await getProfile(interaction.user.id);
		if (profile.mincoDollars < bet) {
			return interaction.reply({
				content: `You don't have **${bet}** Minco Dollars.`,
				ephemeral: true,
			});
		}
		await interaction.deferReply();
		const game = new Blackjack(interaction, bet, isSession, rounds);
		game.gameLogic();
	});

export default blackjackCommand;
