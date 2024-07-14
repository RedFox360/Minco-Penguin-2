import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	userMention,
} from "discord.js";
import BSPoker from "./classes/BSPokerGame.js";
import { removeByValue, msToRelTimestamp, shuffleArray } from "../util.js";
import { getProfile } from "../../prisma/models.js";
import { colors } from "../util.js";
import { bsPokerTeams, channelsWithActiveGames } from "../../main.js";
import OptionManager, { OptionCreationError } from "./classes/OptionManager.js";
const collectorTime = 60_000;

const customIds = {
	join: "join_bspoker_s",
	leave: "leave_bspoker_s",
	abort: "abort_bspoker_s",
	start: "start_bspoker_s",
};
const customIdValues = Object.values(customIds);

export default async function bsPokerRun(
	interaction: ChatInputCommandInteraction<"cached">
) {
	if (channelsWithActiveGames.has(interaction.channelId)) {
		await interaction.reply({
			content: "There is already an active game in this channel.",
			ephemeral: true,
		});
		return;
	}

	// Retrieving Options
	let options: OptionManager;
	try {
		options = new OptionManager(interaction);
	} catch (e) {
		if (e instanceof OptionCreationError) {
			await interaction.reply({
				content: e.message,
				ephemeral: true,
			});
		} else {
			console.error(e);
		}
		return;
	}

	const hostProfile = await getProfile(interaction.user.id);
	if (options.startingBet && hostProfile.mincoDollars < options.startingBet) {
		await interaction.reply({
			content: `You do not have enough Minco Dollars to start this game with a bet of ${options.startingBet}.`,
			ephemeral: true,
		});
		return;
	}

	const players = [interaction.user.id];
	channelsWithActiveGames.add(interaction.channelId);

	// Game Start

	const joinButton = new ButtonBuilder()
		.setCustomId(customIds.join)
		.setLabel("Join")
		.setStyle(ButtonStyle.Primary)
		.setEmoji("✅");
	const leaveButton = new ButtonBuilder()
		.setCustomId(customIds.leave)
		.setLabel("Leave")
		.setStyle(ButtonStyle.Primary)
		.setEmoji("❎");
	const abortButton = new ButtonBuilder()
		.setCustomId(customIds.abort)
		.setLabel("Abort")
		.setStyle(ButtonStyle.Danger)
		.setEmoji("⏹️");
	const startButton = new ButtonBuilder()
		.setCustomId(customIds.start)
		.setLabel("Start Now")
		.setStyle(ButtonStyle.Success)
		.setEmoji("⏩")
		.setDisabled(true);

	const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		joinButton,
		leaveButton
	);
	const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
		abortButton,
		startButton
	);

	const betDisplay = options.startingBet
		? `Bet to Join: **${options.startingBet} MD**`
		: "**No bet required.**";

	const startTime = msToRelTimestamp(collectorTime);

	const optionsFieldValue = options.display();

	const gameStartEmbed = (gameStarted = false) =>
		new EmbedBuilder()
			.setTitle(gameStarted ? "BS Poker Game Started" : "BS Poker")
			.setDescription(
				`Welcome to a game of BS Poker!
Current players: ${players.map(userMention).join(", ")}\n` +
					(gameStarted
						? betDisplay
						: `${options.playerLimit - players.length} more players can join.${
								players.length >= 2
									? ""
									: " Minimum 2 players required to start the game."
						  }
${betDisplay}
<@${
								interaction.user.id
						  }> is the host of the game and can abort or start it immediately.
Otherwise, the game will start ${startTime}`)
			)
			.addFields({
				name: "Options",
				value: optionsFieldValue,
			})
			.setTimestamp()
			.setColor(gameStarted ? colors.blurple : colors.green)
			.setFooter({
				text: interaction.guild.name,
				iconURL: interaction.member.displayAvatarURL(),
			});

	const msg = await interaction.reply({
		embeds: [gameStartEmbed()],
		components: [row1, row2],
	});

	const collector = msg.createMessageComponentCollector({
		filter: i => customIdValues.includes(i.customId),
		time: collectorTime,
		componentType: ComponentType.Button,
	});
	let shouldBeginGame = true;
	collector.on("collect", async buttonInteraction => {
		if (buttonInteraction.customId === customIds.join) {
			if (players.length >= options.playerLimit) {
				await buttonInteraction.reply({
					content: "Sorry, the player limit has been reached.",
					ephemeral: true,
				});
				return;
			}
			const joinerProfile = await getProfile(buttonInteraction.user.id);
			if (
				options.startingBet &&
				joinerProfile.mincoDollars < options.startingBet
			) {
				await buttonInteraction.reply({
					content: `You do not have enough Minco Dollars to join this game (the bet is **${options.startingBet} MD**).`,
					ephemeral: true,
				});
				return;
			}
			if (!players.includes(buttonInteraction.user.id)) {
				players.push(buttonInteraction.user.id);
				startButton.setDisabled(false);
			}
			buttonInteraction.update({
				embeds: [gameStartEmbed()],
				components: [row1, row2],
			});
		}
		if (buttonInteraction.customId === customIds.leave) {
			if (buttonInteraction.user.id === interaction.user.id) {
				await buttonInteraction.reply({
					content: "You may not leave as you are the host of the game.",
					ephemeral: true,
				});
				return;
			}
			removeByValue(players, buttonInteraction.user.id);
			if (players.length <= 1) {
				startButton.setDisabled(true);
			}
			buttonInteraction.update({
				embeds: [gameStartEmbed()],
				components: [row1, row2],
			});
		}
		if (buttonInteraction.customId === customIds.abort) {
			if (buttonInteraction.user.id !== interaction.user.id) {
				await buttonInteraction.reply({
					content: "Only the host can abort the game.",
					ephemeral: true,
				});
				return;
			}
			buttonInteraction.update({
				content: "Game aborted by host.",
				embeds: [],
				components: [],
			});
			shouldBeginGame = false;
			collector.stop();
		}
		if (buttonInteraction.customId === customIds.start) {
			if (buttonInteraction.user.id !== interaction.user.id) {
				await buttonInteraction.reply({
					content: "Only the host can start the game.",
					ephemeral: true,
				});
				return;
			}
			buttonInteraction.update({
				embeds: [gameStartEmbed(true)],
				components: [],
			});
			collector.stop();
		}
	});
	collector.on("end", async () => {
		if (!shouldBeginGame) {
			channelsWithActiveGames.delete(interaction.channelId);
			return;
		}
		if (players.length <= 1) {
			msg.edit({
				content: "Game aborted due to insufficient players.",
				embeds: [],
				components: [],
			});
			channelsWithActiveGames.delete(interaction.channelId);
			return;
		}
		msg.edit({
			embeds: [gameStartEmbed(true)],
			components: [],
		});
		shuffleArray(players);
		bsPokerTeams.set(
			interaction.channelId,
			players.map(x => [x])
		);

		const game = new BSPoker(interaction, players, options);

		game.gameLogic().catch(e => {
			interaction.channel.send(
				"Sorry, but an unknown error occured while running the game and the game has aborted."
			);
			console.error(e);

			channelsWithActiveGames.delete(interaction.channelId);
		});
	});
}
