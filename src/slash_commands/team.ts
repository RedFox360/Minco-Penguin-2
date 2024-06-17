import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	userMention,
} from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import { timeToRelativeTimestamp } from "../functions/util.js";
import { bsPokerTeams, channelsWithActiveGames } from "../main.js";

const timeToJoinTeam = 30_000;
const joinButton = new ButtonBuilder()
	.setLabel("Join")
	.setCustomId("join")
	.setStyle(ButtonStyle.Success);
const joinRow = new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton);
const team = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("team")
			.setDescription("Join or leave a team in BS Poker")
			.addSubcommand(subcommand =>
				subcommand
					.setName("join")
					.setDescription("Join a BS Poker team with a player in the game")
					.addUserOption(option =>
						option
							.setName("player")
							.setDescription("The player whose team you want to join")
							.setRequired(true)
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName("invite")
					.setDescription(
						"Invite someone outside of the game to join your team"
					)
					.addUserOption(option =>
						option
							.setName("player")
							.setDescription("The player you want to invite")
							.setRequired(true)
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName("leave")
					.setDescription("Leave the BS Poker team that you are in")
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName("view")
					.setDescription("View the players in your BS Poker team")
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName("kick")
					.setDescription("Kick a player from your BS Poker team")
					.addUserOption(option =>
						option
							.setName("player")
							.setDescription("The player you want to kick")
							.setRequired(true)
					)
			)
	)
	.setRun(async interaction => {
		const subcommand = interaction.options.getSubcommand();
		if (!channelsWithActiveGames.includes(interaction.channelId)) {
			await interaction.reply({
				content: "There is no active game in this channel",
				ephemeral: true,
			});
			return;
		}
		if (!bsPokerTeams.has(interaction.channelId))
			bsPokerTeams.set(interaction.channelId, []);

		const thisChannelTeams = bsPokerTeams.get(interaction.channel.id);

		const teamWithAsker = thisChannelTeams.find(x =>
			x.includes(interaction.user.id)
		);

		if (subcommand === "join") {
			const player = interaction.options.getUser("player");
			if (player.id === interaction.user.id) {
				await interaction.reply({
					content: "You may not join a team with yourself.",
					ephemeral: true,
				});
				return;
			}
			if (teamWithAsker) {
				await interaction.reply({
					content:
						"You are already in a team or a player in the current game. If you are a player, use </team invite:1251396824674340938> to add someone to your team.",
					ephemeral: true,
				});
				return;
			}

			const teamWithPlayer = bsPokerTeams
				.get(interaction.channel.id)
				.find(x => x.includes(player.id));

			if (!teamWithPlayer) {
				await interaction.reply({
					content: "This player is not in the game.",
					ephemeral: true,
				});
				return;
			}
			const hostId = teamWithPlayer[0];
			if (hostId !== player.id) {
				await interaction.reply({
					content: `This player is not the host of their team. Try joining <@${hostId}> instead.`,
					ephemeral: true,
				});
				return;
			}
			const timeUpToJoin = timeToRelativeTimestamp(timeToJoinTeam);
			const msg = await interaction.reply({
				content: `${player} — ${interaction.user} has invited you to join their team. Click the button below to join ${timeUpToJoin}.`,
				components: [joinRow],
			});
			msg
				.awaitMessageComponent({
					componentType: ComponentType.Button,
					filter: i => i.user.id === player.id && i.customId === "join",
					idle: 0,
					time: timeToJoinTeam,
				})
				.then(bi => {
					teamWithPlayer.push(interaction.user.id);
					bi.update({
						content: `${interaction.user} has joined a team with host ${player}.`,
						components: [],
					});
				})
				.catch(() => {
					msg.edit({
						content: `${player} did not join your team.`,
						components: [],
					});
				});
		} else if (subcommand === "invite") {
			const hostId = teamWithAsker?.[0];
			if (hostId !== interaction.user.id) {
				await interaction.reply({
					content: "Only a team host may invite players to their team.",
					ephemeral: true,
				});
				return;
			}
			const player = interaction.options.getUser("player");
			if (player.id === interaction.user.id) {
				await interaction.reply({
					content: "You may not invite yourself to a team.",
					ephemeral: true,
				});
				return;
			}
			const teamWithPlayer = bsPokerTeams
				.get(interaction.channel.id)
				.find(x => x.includes(player.id));
			if (teamWithPlayer) {
				await interaction.reply({
					content: "This player is already in a team.",
					ephemeral: true,
				});
				return;
			}

			const timeUpToJoin = timeToRelativeTimestamp(timeToJoinTeam);
			const msg = await interaction.reply({
				content: `${player} — ${interaction.user} has invited you to join their team. Click the button below to join ${timeUpToJoin}.`,
				components: [joinRow],
			});
			msg
				.awaitMessageComponent({
					componentType: ComponentType.Button,
					filter: i => i.user.id === player.id && i.customId === "join",
					idle: 0,
					time: timeToJoinTeam,
				})
				.then(bi => {
					teamWithAsker.push(bi.user.id);
					bi.update({
						content: `${player} has joined a team with host ${interaction.user}.`,
						components: [],
					});
				})
				.catch(() => {
					msg.edit({
						content: `${player} did not join your team.`,
						components: [],
					});
				});
		} else if (subcommand === "leave") {
			if (!teamWithAsker || teamWithAsker.length === 1) {
				await interaction.reply({
					content: "You are not in a team.",
					ephemeral: true,
				});
				return;
			}
			if (teamWithAsker[0] === interaction.user.id) {
				await interaction.reply({
					content: "You may not leave as you are the host of your team.",
					ephemeral: true,
				});
				return;
			}

			const index = teamWithAsker.indexOf(interaction.user.id);
			if (index !== -1) {
				teamWithAsker.splice(index, 1);
				interaction.reply("You have left your team.");
				return;
			}
			await interaction.reply({
				content: "You are not in a team.",
				ephemeral: true,
			});
		} else if (subcommand === "view") {
			if (!teamWithAsker || teamWithAsker.length === 1) {
				await interaction.reply({
					content: "You are not in a team.",
					ephemeral: true,
				});
				return;
			}

			await interaction.reply({
				content: `Your team members: ${teamWithAsker
					.filter(x => x !== interaction.user.id)
					.map(userMention)
					.join(" ")}`,
				ephemeral: true,
			});
		} else if (subcommand === "kick") {
			const player = interaction.options.getUser("player");
			if (!teamWithAsker || teamWithAsker.length === 1) {
				await interaction.reply({
					content: "You are not in a team.",
					ephemeral: true,
				});
				return;
			}
			if (player.id === interaction.user.id) {
				await interaction.reply({
					content:
						"You may not kick yourself from your team. Try using </team leave:1251396824674340938>.",
					ephemeral: true,
				});
				return;
			}
			if (teamWithAsker[0] !== interaction.user.id) {
				await interaction.reply({
					content: "You are not the host of your team.",
					ephemeral: true,
				});
				return;
			}
			const index = teamWithAsker.indexOf(player.id);
			if (index === -1) {
				await interaction.reply({
					content: "This player is not in your team.",
					ephemeral: true,
				});
				return;
			}
			teamWithAsker.splice(index, 1);
			await interaction.reply({
				content: `You have kicked ${player} from your team.`,
			});
		}
	});

export default team;
