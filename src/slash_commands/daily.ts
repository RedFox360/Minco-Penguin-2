import { EmbedBuilder } from "discord.js";
import { getProfile, updateProfile } from "../prisma/models.js";
import SlashCommand from "../core/SlashCommand.js";
import { randomInt } from "crypto";
import { absTimeToRelativeTimestamp } from "../functions/util.js";
const dayLength = 86_400_000;

const daily = new SlashCommand()
	.setCommandData(builder =>
		builder.setName("daily").setDescription("Claim your daily reward!")
	)
	.setRun(async interaction => {
		const lastDailyClaim = (
			await getProfile(interaction.user.id)
		).lastDailyClaim?.getTime();
		const now = Date.now();

		if (lastDailyClaim && lastDailyClaim + dayLength > now) {
			const timeToClaimDaily = absTimeToRelativeTimestamp(
				lastDailyClaim + dayLength
			);
			await interaction.reply({
				content: `You may use /daily again ${timeToClaimDaily}.`,
				ephemeral: true,
			});
			return;
		}

		const upperLimit = 50;
		let description = "";
		// random int between 25 (inclusive) and 50 (exclusive)
		const randomAmount = randomInt(25, upperLimit);
		await updateProfile(interaction.user.id, {
			mincoDollars: {
				increment: randomAmount,
			},
			lastDailyClaim: new Date(),
		});
		description += `You earned ${randomAmount} Minco Dollars!`;

		const dailyEmbed = new EmbedBuilder()
			.setColor(0xffa845)
			.setTitle("Daily Reward")
			.setFooter({
				text: interaction.member.displayName,
				iconURL: interaction.member.displayAvatarURL(),
			})
			.setDescription(description);

		await interaction.reply({ embeds: [dailyEmbed] });
	});

export default daily;
