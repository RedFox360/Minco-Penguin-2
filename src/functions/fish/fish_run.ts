import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	User,
	userMention,
} from "discord.js";
import Fish from "./classes/Fish.js";
import { channelsWithActiveGames } from "../../main.js";
import {
	colors,
	hasAdminForGames,
	msToRelTimestamp,
	removeByValue,
	removeC,
	shuffleArray,
} from "../util.js";
import Subcommand from "../../core/Subcommand.js";

const collectorTime = 300_000;
const customIds = {
	join0: "join_fish_0_s",
	join1: "join_fish_1_s",
	leave: "leave_fish_s",
	abort: "abort_fish_s",
};
const customIdValues = Object.values(customIds);
function formatTeam(team: readonly User[]) {
	if (team.length === 0) return "None";
	return team.join(", ");
}

const FishRun = new Subcommand()
	.setCommandData(builder =>
		builder
			.setName("play")
			.setDescription("Play a game of fish (6 people required)")
			.addBooleanOption(option =>
				option
					.setName("shuffle_teams")
					.setDescription(
						"Teams will be shuffled before the game starts (Does not matter whether you join team 1 or 2)"
					)
					.setRequired(false)
			)
			.addBooleanOption(option =>
				option
					.setName("delete_history")
					.setDescription(
						"All messages by players are deleted 2 minutes after they being sent (Default: true)"
					)
					.setRequired(false)
			)
	)
	.setRun(async interaction => {
		const deleteHistory =
			interaction.options.getBoolean("delete_history") ?? true;
		if (
			interaction.guild.id === process.env.MAIN_GUILD_ID &&
			deleteHistory &&
			!interaction.channel.name.toLowerCase().startsWith("fish")
		) {
			await interaction.reply({
				content:
					'In the HCH, Minco Penguin 2, can only play fish games in channels/threads that start with "fish" when `delete_history` is enabled.',
				ephemeral: true,
			});
			return;
		}
		if (channelsWithActiveGames.has(interaction.channelId)) {
			await interaction.reply({
				content: "There is already an active game in this channel.",
				ephemeral: true,
			});
			return;
		}

		let team0: User[] = [interaction.user];
		let team1: User[] = [];
		const shuffleTeams =
			interaction.options.getBoolean("shuffle_teams") ?? false;

		const join0Button = new ButtonBuilder()
			.setCustomId(customIds.join0)
			.setLabel("Join Team 1")
			.setStyle(ButtonStyle.Primary)
			.setEmoji("✅");
		const join1Button = new ButtonBuilder()
			.setCustomId(customIds.join1)
			.setLabel("Join Team 2")
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

		const getRow = () =>
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				join0Button,
				join1Button,
				leaveButton,
				abortButton
			);
		let row = getRow();

		const startTime = msToRelTimestamp(collectorTime);

		const getEmbed = (gameStarted = false) => {
			let description = "Welcome to a game of Fish!";
			if (!gameStarted) {
				description += `\nThe game will start once 3 people join each team.
This pending game will expire ${startTime}.`;
				if (shuffleTeams) {
					description +=
						"\nTeams will be **randomly shuffled** before the game starts.";
				}
			}
			return new EmbedBuilder()
				.setTitle(gameStarted ? "Fish Started" : "Fish")
				.setDescription(
					`${description}
Team 1: ${formatTeam(team0)}
Team 2: ${formatTeam(team1)}`
				)
				.setTimestamp()
				.setColor(gameStarted ? colors.blurple : colors.green)
				.setFooter({
					text: interaction.guild.name,
					iconURL: interaction.member.displayAvatarURL(),
				});
		};

		const msg = await interaction.reply({
			embeds: [getEmbed()],
			components: [row],
		});
		channelsWithActiveGames.add(interaction.channelId);

		const collector = msg.createMessageComponentCollector({
			filter: i => customIdValues.includes(i.customId),
			time: collectorTime,
			componentType: ComponentType.Button,
		});
		collector.on("collect", buttonInteraction => {
			switch (buttonInteraction.customId) {
				case customIds.join0:
				case customIds.join1: {
					const isTeam0 = buttonInteraction.customId === customIds.join0;
					const teamApplicable = isTeam0 ? team0 : team1;
					const otherTeam = isTeam0 ? team1 : team0;
					if (teamApplicable.some(u => u.id === buttonInteraction.user.id)) {
						buttonInteraction.deferUpdate();
						return;
					}
					if (teamApplicable.length === 3) {
						buttonInteraction.reply({
							content: "Team 1 is full.",
							ephemeral: true,
						});
						return;
					}
					const removed = removeC(
						otherTeam,
						u => u.id === buttonInteraction.user.id
					);
					teamApplicable.push(buttonInteraction.user);
					buttonInteraction.deferUpdate();
					if (removed && otherTeam.length === 2) {
						if (isTeam0) join1Button.setDisabled(false);
						else join0Button.setDisabled(false);
						row = getRow();
					}
					if (teamApplicable.length === 3) {
						if (otherTeam.length !== 3) {
							if (isTeam0) join0Button.setDisabled();
							else join1Button.setDisabled();
							row = getRow();
						} else {
							collector.stop("success");
							msg.edit({
								embeds: [getEmbed(true)],
								components: [],
							});
							return;
						}
					}
					msg.edit({
						embeds: [getEmbed()],
						components: [row],
					});
					return;
				}
				case customIds.leave: {
					const s1 = removeByValue(team0, buttonInteraction.user);
					const s2 = removeByValue(team1, buttonInteraction.user);
					if (s1 && team0.length === 2) {
						join0Button.setDisabled(false);
						row = getRow();
					} else if (s2 && team1.length === 2) {
						join1Button.setDisabled(false);
						row = getRow();
					}
					buttonInteraction.deferUpdate();
					if (s1 || s2) {
						msg.edit({
							embeds: [getEmbed()],
							components: [row],
						});
					}
					return;
				}
				case customIds.abort: {
					if (
						!hasAdminForGames(
							buttonInteraction.user.id,
							buttonInteraction.member.permissions,
							interaction.user.id
						)
					) {
						buttonInteraction.reply({
							content: "Only the host can abort the game.",
							ephemeral: true,
						});
						return;
					}
					collector.stop("game_abort");
					return;
				}
			}
		});

		collector.on("end", (_, reason) => {
			if (reason === "game_abort") {
				msg.edit({
					content: "Game aborted by host.",
					embeds: [],
					components: [],
				});
				channelsWithActiveGames.delete(interaction.channelId);
				return;
			}
			if (reason === "time") {
				msg.edit({
					content: "Game expired.",
					embeds: [],
					components: [],
				});
				channelsWithActiveGames.delete(interaction.channelId);
				return;
			}

			if (shuffleTeams) {
				const allPlayers = [...team0, ...team1];
				shuffleArray(allPlayers);
				team0 = allPlayers.slice(0, 3);
				team1 = allPlayers.slice(3);
			}

			const game = new Fish(
				interaction.channel,
				interaction.user.id,
				team0,
				team1,
				deleteHistory
			);
			game.gameLogic();
		});
	});

export default FishRun;
