import { Client, EmbedBuilder, Events } from "discord.js";
import { clean, colors, invalidNumber } from "../functions/util.js";
import { updateProfile } from "../prisma/models.js";
const ownerId = process.env.OWNER_ID;

export default (client: Client<true>) => {
	client.on(Events.MessageCreate, async message => {
		if (message.author.id !== ownerId) return;

		if (message.content.startsWith("!eval")) {
			const code = message.content.slice(6);
			try {
				eval(code);
			} catch (err) {
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

		if (message.content.startsWith("!giveuser")) {
			const amountStr = message.content.split(" ")[2];
			const mention = message.mentions.users.first();
			if (!mention) return;
			const amount = parseInt(amountStr);
			if (invalidNumber(amount)) return;
			await updateProfile(mention.id, { mincoDollars: { increment: amount } });
			message.reply(`Added **${amount} MD** to ${mention}'s profile`);
			return;
		}

		if (message.content.startsWith("!echo")) {
			const text = message.content.slice(6);
			message.channel.send(text);
		}
	});
};
