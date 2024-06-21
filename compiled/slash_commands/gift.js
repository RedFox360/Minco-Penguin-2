import { getProfile, updateProfile } from "../prisma/models.js";
import SlashCommand from "../core/SlashCommand.js";
const gift = new SlashCommand()
    .setCommandData(builder => builder
    .setName("gift")
    .setDescription("Gift money to a user!")
    .addUserOption(option => option
    .setName("user")
    .setDescription("The user to gift money to")
    .setRequired(true))
    .addIntegerOption(option => option
    .setName("md_amount")
    .setDescription("The amount of money to gift")
    .setMinValue(1)
    .setRequired(true)))
    .setRun(async (interaction) => {
    const user = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("md_amount");
    if (amount < 1) {
        await interaction.reply({
            content: "Please enter a positive amount of Minco Dollars",
            ephemeral: true,
        });
        return;
    }
    const profile = await getProfile(interaction.user.id);
    if (user.id === interaction.user.id) {
        await interaction.reply({
            content: "You can't gift money to yourself!",
            ephemeral: true,
        });
        return;
    }
    if (amount > profile.mincoDollars) {
        await interaction.reply({
            content: `You don't have ${amount} Minco Dollars`,
            ephemeral: true,
        });
        return;
    }
    await updateProfile(interaction.user.id, {
        mincoDollars: { decrement: amount },
    }, false);
    await updateProfile(user.id, { mincoDollars: { increment: amount } });
    await interaction.reply(`You gifted ${amount} MD to ${user}`);
});
export default gift;
//# sourceMappingURL=gift.js.map