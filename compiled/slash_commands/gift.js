import { getProfile, updateProfile } from "../prisma/models.js";
import SlashCommand from "../core/SlashCommand.js";
const gift = new SlashCommand()
    .setCommandData(builder => builder
    .setName("gift")
    .setDescription("Gift money to someone!")
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
    const user = interaction.options.getUser("user", true);
    if (user.id === interaction.user.id) {
        interaction.reply({
            content: "You can't gift money to yourself.",
            ephemeral: true,
        });
        return;
    }
    const amount = interaction.options.getInteger("md_amount", true);
    const profile = await getProfile(interaction.user.id);
    if (amount > profile.mincoDollars) {
        interaction.reply({
            content: `You do not have ${amount.toLocaleString()} Minco Dollars.`,
            ephemeral: true,
        });
        return;
    }
    await Promise.all([
        updateProfile(interaction.user.id, {
            mincoDollars: { decrement: amount },
        }, false),
        updateProfile(user.id, { mincoDollars: { increment: amount } }),
    ]);
    await interaction.reply(`:gift: You gifted ${amount.toLocaleString()} MD to ${user}.`);
});
export default gift;
//# sourceMappingURL=gift.js.map