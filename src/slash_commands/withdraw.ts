import SlashCommand from "../core/SlashCommand.js";
import { getProfile, updateProfile } from "../prisma/models.js";

const withdraw = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("withdraw")
			.setDescription("Withdraw money from your bank")
			.addIntegerOption(option =>
				option
					.setName("amount")
					.setDescription("The amount of MD to withdraw")
					.setMinValue(1)
					.setRequired(true)
			)
	)
	.setRun(async interaction => {
		const amount = interaction.options.getInteger("amount", true);
		const profile = await getProfile(interaction.user.id);
		if (amount > profile.bank) {
			await interaction.reply({
				content: `You do not have ${amount.toLocaleString()} Minco Dollars in your bank.`,
				ephemeral: true,
			});
			return;
		}
		await updateProfile(
			interaction.user.id,
			{
				mincoDollars: {
					increment: amount,
				},
				bank: {
					decrement: amount,
				},
			},
			false
		);
		await interaction.reply(
			`You withdrew **${amount.toLocaleString()}** Minco Dollars from your bank.`
		);
	});

export default withdraw;
