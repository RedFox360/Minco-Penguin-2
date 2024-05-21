import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	Snowflake,
	TimestampStyles,
	time,
} from "discord.js";
import { gameLogic } from "../bs_poker/bs_poker_functions.js";
const collectorTime = 30_000;
const channelsWithActiveGames: Snowflake[] = [];

export default async function run(
	interaction: ChatInputCommandInteraction<"cached">
) {
	if (channelsWithActiveGames.includes(interaction.channelId)) {
		await interaction.reply({
			content: "There is already an active game in this channel.",
			ephemeral: true,
		});
		return;
	}

	// Retrieving Options
	const cardsToOut: number = interaction.options.getInteger("cards_to_out");
	const commonCards: number =
		interaction.options.getInteger("common_cards") ?? -1;
	const jokerCount: number = interaction.options.getInteger("joker_count") ?? 2;
	const insuranceCount: number =
		interaction.options.getInteger("insurance_count") ?? 1;
	const deckSize = 52 + jokerCount + insuranceCount;
	const playerLimit: number =
		interaction.options.getInteger("player_limit") ??
		Math.floor(deckSize / (cardsToOut - 1));
	const players = [interaction.user.id];
	channelsWithActiveGames.push(interaction.channelId);

	if ((cardsToOut - 1) * playerLimit > deckSize) {
		await interaction.reply({
			content:
				"The maximum number of cards to be dealt is greater than the size of the deck. Please alter the player limit.",
			ephemeral: true,
		});
		return;
	}

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
	const createEmbed = (gameStarted = false) =>
		new EmbedBuilder()
			.setTitle(gameStarted ? "BS Poker Game Starting" : "BS Poker")
			.setDescription(
				`Welcome to a game of BS Poker!
Current players: ${players.map(player => `<@${player}>`).join(", ")}` +
					(gameStarted
						? ""
						: `\n${playerLimit - players.length} more players can join.${
								players.length >= 2
									? ""
									: " Minimum 2 players required to start the game."
						  }

<@${
								interaction.user.id
						  }> is the host of the game and can abort or start it immediately.
Otherwise, the game will start in ${time(
								Math.floor(startTime / 1000),
								TimestampStyles.RelativeTime
						  )}`)
			)
			.addFields({
				name: "Options",
				value: `Cards to get out: ${cardsToOut}\nJokers in Deck: ${jokerCount}\nInsurance Cards in Deck: ${insuranceCount}\nCommon Cards: ${
					commonCards === -1 ? "Median" : commonCards
				}`,
			})
			.setTimestamp()
			.setColor(gameStarted ? 0x58d68d : 0x7289da)
			.setFooter({ text: interaction.guild.name });

	const msg = await interaction.reply({
		embeds: [createEmbed()],
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
			if (players.length >= playerLimit) {
				await buttonInteraction.reply({
					content: "Sorry, the player limit has been reached.",
					ephemeral: true,
				});
				return;
			}
			if (!players.includes(buttonInteraction.user.id)) {
				players.push(buttonInteraction.user.id);
				startButton.setDisabled(false);
			}
			await buttonInteraction.update({
				embeds: [createEmbed()],
				components: [row1, row2],
			});
		}
		if (buttonInteraction.customId === "leave") {
			if (buttonInteraction.user.id === interaction.user.id) {
				await buttonInteraction.reply({
					content: "You cannot leave as you are the host of the game.",
					ephemeral: true,
				});
				return;
			}
			const index = players.indexOf(buttonInteraction.user.id);
			if (index > -1) {
				players.splice(index, 1);
			}
			if (players.length <= 1) {
				startButton.setDisabled(true);
			}
			await buttonInteraction.update({
				embeds: [createEmbed()],
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
				embeds: [createEmbed(true)],
				components: [],
			});
			collector.stop();
		}
	});
	collector.on("end", async () => {
		if (!handleGameLogic) {
			channelsWithActiveGames.splice(
				channelsWithActiveGames.indexOf(interaction.channelId),
				1
			);
			return;
		}
		if (players.length <= 1) {
			await msg.edit({
				content: "Game aborted due to insufficient players.",
				embeds: [],
				components: [],
			});
			channelsWithActiveGames.splice(
				channelsWithActiveGames.indexOf(interaction.channelId),
				1
			);
			return;
		}
		await msg.edit({
			embeds: [createEmbed(true)],
			components: [],
		});
		shuffleArrayInPlace(players);

		gameLogic(
			interaction,
			players,
			cardsToOut,
			commonCards,
			jokerCount,
			insuranceCount
		)
			.catch(() => {
				interaction.channel.send(
					"Sorry, but an unknown error occured while running the game and the game has aborted."
				);
			})
			.finally(() => {
				channelsWithActiveGames.splice(
					channelsWithActiveGames.indexOf(interaction.channelId),
					1
				);
			});
	});
}

function shuffleArrayInPlace(arr: any[]) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
}
