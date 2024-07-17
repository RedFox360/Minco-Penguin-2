import { Collection, GuildMember, Snowflake } from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import { prisma } from "../main.js";
import { asciiTable, invalidNumber } from "../functions/util.js";
import LeaderboardPaginator from "../functions/classes/LeaderboardPaginator.js";

const leaderboard = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("leaderboard")
			.setDescription("View leaderboards")
			.addSubcommand(subcommand =>
				subcommand
					.setName("md")
					.setDescription("View the Minco Dollar leaderboard of the server")
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName("poker_stats")
					.setDescription("View the Poker Stats leaderboard of the server")
			)
	)
	.setCooldown(60)
	.setRun(async interaction => {
		const isMD = interaction.options.getSubcommand() === "md";
		let members: Collection<Snowflake, GuildMember>;
		try {
			members = await interaction.guild.members.fetch({
				limit: 500,
			});
		} catch (err) {
			await interaction.reply({
				content:
					"Sorry, Minco Penguin could not fetch the members of this server in time. Please try using the command again",
				ephemeral: true,
			});
			return;
		}
		await interaction.deferReply();
		const nonBotIds = members
			.filter(member => !member.user.bot)
			.map(member => member.id);
		const profiles = await prisma.profile.findMany({
			where: {
				userId: {
					in: nonBotIds,
				},
			},
		});
		if (isMD) {
			const rawData = profiles
				.map(profile => ({
					id: profile.userId,
					total: profile.mincoDollars + profile.bank,
				}))
				.sort((a, b) => b.total - a.total);
			const formatted = rawData.map(d => {
				const member = members.get(d.id);
				return `${
					member?.displayName ?? `<@${d.id}>`
				}: **${d.total.toLocaleString()}**`;
			});
			const inCirculation = profiles.reduce(
				(acc, curr) => acc + curr.mincoDollars,
				0
			);
			const paginator = new LeaderboardPaginator({
				title: "MD Leaderboard",
				description: `MD in Circulation: **${inCirculation.toLocaleString()}**`,
				id: interaction.id,
				creatorId: interaction.user.id,
				creatorRank: rawData.findIndex(d => d.id === interaction.user.id) + 1,
				data: formatted,
			});
			const msg = await interaction.editReply(paginator.getMessage());
			paginator.loadCollector(msg);
		} else {
			const validProfiles = profiles.filter(
				profile => profile && profile.bsPokerGamesPlayed > 4
			);
			const namePad =
				Math.max(
					...validProfiles.map(
						p => members.get(p.userId)?.displayName?.length ?? 0
					)
				) + 1;
			const items = <const>[
				{
					name: "Name",
					pad: namePad,
				},
				{
					name: "Win%",
					pad: 5,
				},
				{
					name: "Skill",
					pad: 5,
				},
			];
			const rawData = validProfiles
				.map(profile => {
					let skill = profile.bsPokerRating / profile.bsPokerGamesPlayed;
					if (invalidNumber(skill)) skill = 0;
					let wr = profile.bsPokerWins / profile.bsPokerGamesPlayed;
					if (invalidNumber(wr)) wr = 0;
					return {
						id: profile.userId,
						skill,
						wr,
					};
				})
				.sort((a, b) => {
					if (a.skill === b.skill) return b.wr - a.wr;
					return b.skill - a.skill;
				});
			const tableData = asciiTable(
				items,
				rawData.map(d => {
					const name = members.get(d.id)?.displayName ?? `<@${d.id}>`;
					return [name, (d.wr * 100).toFixed(0), (d.skill * 100).toFixed(0)];
				})
			);
			const paginator = new LeaderboardPaginator({
				title: "Poker Stats Leaderboard",
				description: tableData.top,
				id: interaction.id,
				data: tableData.rows,
				useSpaces: true,
				useBackTick: true,
				creatorId: interaction.user.id,
				creatorRank: rawData.findIndex(d => d.id === interaction.user.id) + 1,
			});
			const msg = await interaction.editReply(paginator.getMessage());
			paginator.loadCollector(msg);
		}
	});

export default leaderboard;
