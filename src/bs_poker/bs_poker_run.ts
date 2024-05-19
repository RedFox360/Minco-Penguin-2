import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
} from "discord.js";
import * as bsPoker from "../bs_poker/bs_poker_functions.js";
const collectorTime = 30_000;
export default async function run(
	interaction: ChatInputCommandInteraction<"cached">
) {
	// Retrieving Options
	const cardsToOut: any = (interaction.options as any).getInteger(
		"cards_to_out"
	);
	const playerLimit: any =
		(interaction.options as any).getInteger("player_limit") ?? 10;
	const players = [interaction.user.id];

	// Game Start

	const joinButton = new ButtonBuilder()
		.setCustomId("join")
		.setLabel("Join")
		.setStyle(ButtonStyle.Primary)
		.setEmoji("✅");
	const leaveButton = new ButtonBuilder()
		.setCustomId("leave")
		.setLabel("Leave")
		.setStyle(ButtonStyle.Primary)
		.setEmoji("❎");
	const abortButton = new ButtonBuilder()
		.setCustomId("abort")
		.setLabel("Abort")
		.setStyle(ButtonStyle.Danger)
		.setEmoji("⏹️");
	const startButton = new ButtonBuilder()
		.setCustomId("start")
		.setLabel("Start Now")
		.setStyle(ButtonStyle.Success)
		.setEmoji("⏩")
		.setDisabled();

	const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		joinButton,
		leaveButton
	);
	const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		abortButton,
		startButton
	);

	const startTime = Date.now() + collectorTime;

	const msg = await interaction.reply({
		embeds: [bsPoker.createEmbed(interaction, playerLimit, players, startTime)],
		components: [row1, row2],
	});

	const collector = msg.createMessageComponentCollector({
		filter: i =>
			i.customId === "join" ||
			i.customId === "leave" ||
			i.customId === "abort" ||
			i.customId === "start",
		time: collectorTime,
		componentType: ComponentType.Button,
	});
	let handleGameLogic = true;
	collector.on("collect", async buttonInteraction => {
		if (buttonInteraction.customId === "join") {
			if (!players.includes(buttonInteraction.user.id)) {
				players.push(buttonInteraction.user.id);
				startButton.setDisabled(false);
			}
			await buttonInteraction.update({
				embeds: [
					bsPoker.createEmbed(interaction, playerLimit, players, startTime),
				],
				components: [row1, row2],
			});
		}
		if (buttonInteraction.customId === "leave") {
			const index = players.indexOf(buttonInteraction.user.id);
			if (index > -1) {
				players.splice(index, 1);
			}
			if (players.length <= 1) {
				startButton.setDisabled(true);
			}
			await buttonInteraction.update({
				embeds: [
					bsPoker.createEmbed(interaction, playerLimit, players, startTime),
				],
				components: [row1, row2],
			});
		}
		if (buttonInteraction.customId === "abort") {
			if (buttonInteraction.user.id !== interaction.user.id) {
				await buttonInteraction.reply({
					content: "Only the host can abort the game.",
					ephemeral: true,
				});
				return;
			}
			await buttonInteraction.update({
				content: "Game aborted by host.",
				embeds: [],
				components: [],
			});
			handleGameLogic = false;
			collector.stop();
		}
		if (buttonInteraction.customId === "start") {
			if (buttonInteraction.user.id !== interaction.user.id) {
				await buttonInteraction.reply({
					content: "Only the host can start the game.",
					ephemeral: true,
				});
				return;
			}
			await buttonInteraction.update({
				embeds: [
					bsPoker.createEmbed(
						interaction,
						playerLimit,
						players,
						startTime,
						true
					),
				],
				components: [],
			});
			collector.stop();
		}
	});
	collector.on("end", async () => {
		if (handleGameLogic && players.length <= 1) {
			await msg.edit({
				content: "Game aborted due to insufficient players.",
				embeds: [],
				components: [],
			});
			return;
		}
		if (handleGameLogic) {
			await msg.edit({
				embeds: [
					bsPoker.createEmbed(
						interaction,
						playerLimit,
						players,
						startTime,
						true
					),
				],
				components: [],
			});
			await bsPoker.gameLogic(interaction, players, cardsToOut);
		}
	});
}
