import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
} from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import { msToRelTimestamp } from "../functions/util.js";
import Connect4 from "../functions/connect4/connect4_class.js";

const customIds = {
	accept: "accept_connect4",
	decline: "decline_connect4",
};
const timeToJoin = 60_000;

const acceptButton = new ButtonBuilder()
	.setLabel("Accept")
	.setCustomId(customIds.accept)
	.setStyle(ButtonStyle.Success);
const declineButton = new ButtonBuilder()
	.setLabel("Decline")
	.setCustomId(customIds.decline)
	.setStyle(ButtonStyle.Danger);
const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	acceptButton,
	declineButton
);

const connect4 = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("connect_4")
			.setDescription("Play a game of Connect 4!")
			.addUserOption(option =>
				option
					.setName("opponent")
					.setDescription("The user you want to play against")
					.setRequired(true)
			)
	)
	.setRun(async interaction => {
		const opponent = interaction.options.getUser("opponent");
		const bet = interaction.options.getInteger("bet") ?? 0;

		const joinTimestamp = msToRelTimestamp(timeToJoin);
		let msgContent = `${opponent}, ${interaction.user} has challenged you to a game of Connect 4!\nUse the buttons to accept/decline ${joinTimestamp}`;
		if (bet) msgContent += `\nBet to join: **${bet} MD**`;
		const msg = await interaction.reply({
			content: msgContent,
			components: [buttonRow],
		});

		msg
			.awaitMessageComponent({
				componentType: ComponentType.Button,
				idle: 0,
				filter: i =>
					i.user.id === opponent.id &&
					(i.customId === customIds.accept || i.customId === customIds.decline),
				time: timeToJoin,
			})
			.then(i => {
				if (i.customId === customIds.decline) {
					i.update({
						content: `${opponent} has declined the Connect 4 challenge.`,
						components: [],
					});
					return;
				}

				i.update({
					content: `${opponent} has accepted the Connect 4 challenge!`,
					components: [],
				});

				const game = new Connect4(interaction, opponent.id);
				game.gameLogic().catch(() => {
					i.channel.send(
						"Sorry, an error occurred during the game and it has aborted."
					);
				});
			})
			.catch(() => {
				msg.edit({
					content: "Connect 4 game canceled — Opponent did not join in time.",
					components: [],
				});
			});
	});

export default connect4;
