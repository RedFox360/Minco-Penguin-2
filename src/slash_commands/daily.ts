import { EmbedBuilder } from "discord.js";
import { getProfile, updateProfile } from "../prisma/models.js";
import SlashCommand from "../core/SlashCommand.js";
import dayjs from "dayjs";
import { colors, randomInt } from "../functions/util.js";

const daily = new SlashCommand()
	.setCommandData(builder =>
		builder.setName("daily").setDescription("Claim your daily reward!")
	)
	.setRun(async interaction => {
		const profile = await getProfile(interaction.user.id);
		const currentDate = dayjs.tz().format("YYYY-MM-DD");
		const lastClaimDate = dayjs.tz(profile.lastDailyClaim).format("YYYY-MM-DD");

		if (currentDate === lastClaimDate) {
			await interaction.reply({
				content: `You may use </daily:1252747326473109627> again tomorrow.`,
				ephemeral: true,
			});
			return;
		}

		const totalMD = profile.mincoDollars + profile.bank;
		const dailyLowerLimit = Math.floor(totalMD * 0.05);
		const dailyUpperLimit = Math.floor(totalMD * 0.1);
		const randomAmount = randomInt(dailyLowerLimit, dailyUpperLimit);
		await updateProfile(interaction.user.id, {
			mincoDollars: {
				increment: randomAmount,
			},
			lastDailyClaim: new Date(),
		});
		const description = `You earned ${randomAmount} Minco Dollars!`;

		const dailyEmbed = new EmbedBuilder()
			.setColor(colors.orange)
			.setTitle("Daily Reward")
			.setDescription(description);

		await interaction.reply({ embeds: [dailyEmbed] });
	});

export default daily;
