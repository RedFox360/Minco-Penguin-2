import { getProfile, updateProfile } from "../prisma/models.js";
import SlashCommand from "../core/SlashCommand.js";
const deposit = new SlashCommand()
    .setCommandData(builder => builder
    .setName("deposit")
    .setDescription("Deposit money into your bank")
    .addIntegerOption(option => option
    .setName("amount")
    .setDescription("The amount of MD to deposit")
    .setMinValue(1)
    .setRequired(true)))
    .setRun(async (interaction) => {
    const amount = interaction.options.getInteger("amount", true);
    const profile = await getProfile(interaction.user.id);
    if (amount > profile.mincoDollars) {
        await interaction.reply({
            content: `You do not have ${amount.toLocaleString()} Minco Dollars in your wallet.`,
            ephemeral: true,
        });
        return;
    }
    await updateProfile(interaction.user.id, {
        mincoDollars: {
            decrement: amount,
        },
        bank: {
            increment: amount,
        },
    }, false);
    await interaction.reply(`You deposited **${amount.toLocaleString()}** Minco Dollars into your bank.`);
});
export default deposit;
//# sourceMappingURL=deposit.js.map