import { EmbedBuilder } from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import { getProfile } from "../prisma/models.js";

const balanceCommand = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("balance")
			.setDescription("View your balance of Minco Dollars")
			.addUserOption(option =>
				option
					.setName("user")
					.setDescription("The user to view the balance of")
					.setRequired(false)
			)
	)
	.setRun(async interaction => {
		const member = interaction.options.getMember("user") ?? interaction.member;
		const profile = await getProfile(member.id);
		const total = profile.mincoDollars + profile.bank;
		const avatar = member.displayAvatarURL();
		const balanceEmbed = new EmbedBuilder()
			.setAuthor({
				name: `${member.displayName}'s Balance`,
				iconURL: avatar,
			})
			.setColor(0xb8ff8b)
			.setDescription(
				`🪙 Wallet: **${profile.mincoDollars.toLocaleString(
					interaction.locale
				)}** Minco Dollars
💵 Bank: **${profile.bank.toLocaleString(interaction.locale)}** Minco Dollars
💰 Total: **${total.toLocaleString(interaction.locale)}** Minco Dollars`
			);
		await interaction.reply({ embeds: [balanceEmbed] });
	});

export default balanceCommand;
