import SlashCommand from "../core/SlashCommand.js";
import { prisma } from "../main.js";
import { asciiTable, invalidNumber, logDaily } from "../functions/util.js";
import LeaderboardPaginator from "../functions/classes/LeaderboardPaginator.js";
function trunc(str, length = 20) {
    if (!str)
        return null;
    return str.length > length ? `${str.slice(0, length - 3)}...` : str;
}
const leaderboard = new SlashCommand()
    .setCommandData(builder => builder
    .setName("leaderboard")
    .setDescription("View leaderboards")
    .addSubcommand(subcommand => subcommand
    .setName("md")
    .setDescription("View the Minco Dollar leaderboard of the server")
    .addBooleanOption(option => option
    .setName("log")
    .setDescription("Use a log scale to approximate how many dailies people have used")
    .setRequired(false)))
    .addSubcommand(subcommand => subcommand
    .setName("poker_stats")
    .setDescription("View the Poker Stats leaderboard of the server")))
    .setCooldown(60)
    .setRun(async (interaction) => {
    const isMD = interaction.options.getSubcommand() === "md";
    let members;
    try {
        members = await interaction.guild.members.fetch({
            limit: 500,
        });
    }
    catch {
        await interaction.reply({
            content: "Sorry, Minco Penguin could not fetch the members of this server in time. Please try using the command again",
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
        const useLog = interaction.options.getBoolean("log") ?? false;
        const rawData = profiles
            .map(profile => {
            const total = profile.mincoDollars + profile.bank;
            return {
                id: profile.userId,
                total,
            };
        })
            .sort((a, b) => b.total - a.total);
        const inCirculation = rawData.reduce((acc, curr) => acc + curr.total, 0);
        const formatted = rawData.map(d => {
            const member = members.get(d.id);
            const mdDisplay = useLog
                ? `**${logDaily(d.total).toFixed(1)}** (${d.total.toLocaleString()})`
                : `**${d.total.toLocaleString()}**`;
            return `${member?.displayName ?? `<@${d.id}>`}: ${mdDisplay}`;
        });
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
    }
    else {
        const validProfiles = profiles
            .filter(profile => profile && profile.bsPokerGamesPlayed > 4)
            .map(profile => {
            const memberName = trunc(members.get(profile.userId)?.displayName);
            return {
                profile,
                memberName,
            };
        });
        if (!validProfiles.length) {
            await interaction.editReply({
                content: "No players have played more than 4 games of BS Poker yet, so the leaderboard is unavailable.",
            });
        }
        const namePad = Math.max(...validProfiles.map(({ memberName }) => memberName?.length ?? 0)) + 1;
        const items = [
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
            .map(({ profile, memberName }) => {
            let skill = profile.bsPokerRating / profile.bsPokerGamesPlayed;
            if (invalidNumber(skill))
                skill = 0;
            let wr = profile.bsPokerWins / profile.bsPokerGamesPlayed;
            if (invalidNumber(wr))
                wr = 0;
            return {
                id: profile.userId,
                memberName,
                skill,
                wr,
            };
        })
            .sort((a, b) => {
            if (a.skill === b.skill)
                return b.wr - a.wr;
            return b.skill - a.skill;
        });
        const tableData = asciiTable(items, rawData.map(d => {
            const name = d.memberName ?? `<@${d.id}>`;
            return [name, (d.wr * 100).toFixed(0), (d.skill * 100).toFixed(0)];
        }));
        const paginator = new LeaderboardPaginator({
            title: "Poker Stats Leaderboard",
            description: tableData.top,
            id: interaction.id,
            data: tableData.rows,
            useSpaces: true,
            creatorId: interaction.user.id,
            creatorRank: rawData.findIndex(d => d.id === interaction.user.id) + 1,
        });
        const msg = await interaction.editReply(paginator.getMessage());
        paginator.loadCollector(msg);
    }
});
export default leaderboard;
//# sourceMappingURL=leaderboard.js.map