import SlashCommand from "../core/SlashCommand.js";
import { getProfile, updateProfile } from "../prisma/models.js";
const withdraw = new SlashCommand()
    .setCommandData(builder => builder
    .setName("withdraw")
    .setDescription("Withdraw money from your bank")
    .addIntegerOption(option => option
    .setName("amount")
    .setDescription("The amount of MD to withdraw")
    .setMinValue(1)
    .setRequired(true)))
    .setRun(async (interaction) => {
    const amount = interaction.options.getInteger("amount");
    if (amount < 1) {
        await interaction.reply({
            content: "Please enter a positive amount of MD",
            ephemeral: true,
        });
        return;
    }
    const profile = await getProfile(interaction.user.id);
    if (amount > profile.bank) {
        await interaction.reply({
            content: "You don't have that amount of Minco Dollars to withdraw",
            ephemeral: true,
        });
        return;
    }
    await updateProfile(interaction.user.id, {
        mincoDollars: {
            increment: amount,
        },
        bank: {
            decrement: amount,
        },
    }, false);
    await interaction.reply(`You withdrew ${amount} Minco Dollars from bank`);
});
export default withdraw;
//# sourceMappingURL=withdraw.js.map