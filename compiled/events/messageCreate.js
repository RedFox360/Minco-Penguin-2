import { EmbedBuilder, Events, } from "discord.js";
import { clean, colors, invalidNumber } from "../functions/util.js";
import { updateProfile } from "../prisma/models.js";
import { inDev } from "../main.js";
import { characterSpawnMessage, randomCharacter, } from "../functions/tnt/character_util.js";
const ownerId = process.env.OWNER_ID;
const prefix = inDev ? "m!" : "!!";
const intervalTime = 3000;
const chance = 0.5;
let interval;
export default (client) => {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.id !== ownerId)
            return;
        if (message.content === `${prefix}beginTimeouts`) {
            const channel = client.channels.cache.get(process.env.TEST_CHANNEL_ID);
            const cmsg = characterSpawnMessage(randomCharacter());
            interval = setInterval(() => {
                if (Math.random() < chance) {
                    channel.send({
                        embeds: [cmsg.embed],
                        components: [cmsg.row],
                    });
                }
            }, intervalTime);
            return;
        }
        if (message.content === `${prefix}endTimeouts`) {
            clearInterval(interval);
            message.reply("Ended timeouts");
            return;
        }
        if (message.content.startsWith(`${prefix}eval`)) {
            const code = message.content.slice(6);
            try {
                eval(code);
            }
            catch (err) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle("**ERROR** ")
                    .setDescription("```xl\n" + clean(err) + "\n```")
                    .setColor(colors.red);
                message.reply({
                    embeds: [errorEmbed],
                });
            }
            return;
        }
        if (message.content.startsWith(`${prefix}giveuser`)) {
            const amountStr = message.content.split(" ")[2];
            const mention = message.mentions.users.first();
            if (!mention)
                return;
            const amount = parseInt(amountStr);
            if (invalidNumber(amount))
                return;
            await updateProfile(mention.id, { mincoDollars: { increment: amount } });
            message.reply(`Added **${amount} MD** to ${mention}'s profile`);
            return;
        }
        if (message.content.startsWith(`${prefix}increment`)) {
            const args = message.content.split(" ");
            const mention = message.mentions.users.first();
            if (!mention)
                return;
            const dataToIncrement = args[1];
            const incrementStr = args[2];
            const incrementValue = parseFloat(incrementStr);
            if (invalidNumber(incrementValue))
                return;
            await updateProfile(mention.id, {
                [dataToIncrement]: { increment: incrementValue },
            });
            await message.reply({
                content: `Incremented \`${dataToIncrement}\` by \`${incrementValue}\` for ${mention}`,
            });
        }
        if (message.content.startsWith(`${prefix}echo`)) {
            const text = message.content.slice(6);
            message.channel.send(text);
        }
    });
};
//# sourceMappingURL=messageCreate.js.map