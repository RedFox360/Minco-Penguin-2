import { EmbedBuilder } from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import { getProfile } from "../prisma/models.js";
import { colors, logDaily } from "../functions/util.js";
const balanceCommand = new SlashCommand()
    .setCommandData(builder => builder
    .setName("balance")
    .setDescription("View your balance of Minco Dollars")
    .addUserOption(option => option
    .setName("user")
    .setDescription("The user to view the balance of")
    .setRequired(false))
    .addBooleanOption(option => option
    .setName("log")
    .setDescription("Use a log scale to approximate how many dailies people have used")
    .setRequired(false)))
    .setRun(async (interaction) => {
    const member = interaction.options.getMember("user") ?? interaction.member;
    const useLog = interaction.options.getBoolean("log") ?? false;
    const profile = await getProfile(member.id);
    const total = profile.mincoDollars + profile.bank;
    let description = `🪙 Wallet: **${profile.mincoDollars.toLocaleString(interaction.locale)}** Minco Dollars
💵 Bank: **${profile.bank.toLocaleString(interaction.locale)}** Minco Dollars
💰 Total: **${total.toLocaleString(interaction.locale)}** Minco Dollars`;
    if (useLog) {
        const logScale = logDaily(total);
        description += `\n📈 Daily Log Scale: **${logScale.toFixed(1)}**`;
    }
    const balanceEmbed = new EmbedBuilder()
        .setAuthor({
        name: `${member.displayName}'s Balance`,
        iconURL: member.displayAvatarURL(),
    })
        .setColor(colors.brightGreen)
        .setDescription(description);
    await interaction.reply({ embeds: [balanceEmbed] });
});
export default balanceCommand;
//# sourceMappingURL=balance.js.map