import { EmbedBuilder } from "discord.js";
import { getProfile, updateProfile } from "../prisma/models.js";
import SlashCommand from "../core/SlashCommand.js";
import dayjs from "dayjs";
import { colors, randomInt } from "../functions/util.js";

const dailyLowerLimit = 50;
const dailyUpperLimit = 101;

const daily = new SlashCommand()
	.setCommandData(builder =>
		builder.setName("daily").setDescription("Claim your daily reward!")
	)
	.setRun(async interaction => {
		const { lastDailyClaim } = await getProfile(interaction.user.id);
		const currentDate = dayjs().format("YYYY-MM-DD");
		const lastClaimDate = dayjs(lastDailyClaim).format("YYYY-MM-DD");

		if (currentDate === lastClaimDate) {
			await interaction.reply({
				content: `You may use /daily again tomorrow.`,
				ephemeral: true,
			});
			return;
		}

		let description = "";
		const randomAmount = randomInt(dailyLowerLimit, dailyUpperLimit);
		await updateProfile(interaction.user.id, {
			mincoDollars: {
				increment: randomAmount,
			},
			lastDailyClaim: new Date(),
		});
		description += `You earned ${randomAmount} Minco Dollars!`;

		const dailyEmbed = new EmbedBuilder()
			.setColor(colors.orange)
			.setTitle("Daily Reward")
			.setDescription(description);

		await interaction.reply({ embeds: [dailyEmbed] });
	});

export default daily;
