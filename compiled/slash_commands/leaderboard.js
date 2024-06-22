import { ButtonStyle, ComponentType, EmbedBuilder, } from "discord.js";
import { ActionRowBuilder, ButtonBuilder, } from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import { prisma } from "../main.js";
import { chunkArray, handleMessageError, invalidNumber, } from "../functions/util.js";
const chunkSize = 15;
const collectorTime = 180000;
const customIds = {
    first: "first_lb",
    prev: "prev_lb",
    next: "next_lb",
    last: "last_lb",
};
const leaderboard = new SlashCommand()
    .setCommandData(builder => builder
    .setName("leaderboard")
    .setDescription("View leaderboards")
    .addSubcommand(subcommand => subcommand
    .setName("md")
    .setDescription("View the Minco Dollar leaderboard of the server"))
    .addSubcommand(subcommand => subcommand
    .setName("poker_stats")
    .setDescription("View the Poker Stats leaderboard of the server")))
    .setCooldown(60)
    .setRun(run);
async function run(interaction, givenUsingStats = false, ephemeral = false, givenProfiles, givenCurrentPage = 0) {
    let usingStats;
    if (!givenUsingStats) {
        if (!interaction.isCommand())
            return;
        usingStats = interaction.options.getSubcommand() === "poker_stats";
    }
    let profiles = givenProfiles;
    let currentPage = givenCurrentPage;
    await interaction.deferReply({ ephemeral });
    let members;
    try {
        members = await interaction.guild.members.fetch({
            limit: 500,
        });
    }
    catch (err) {
        await interaction.reply({
            content: "Sorry, Minco Penguin could not fetch the members of this server in time. Please try using the command again",
            ephemeral: true,
        });
        return;
    }
    if (!profiles) {
        const nonBots = members.filter(member => !member.user.bot);
        profiles = (await prisma.profile.findMany({
            where: {
                userId: {
                    in: nonBots.map(member => member.id),
                },
            },
        }))
            .map(profile => {
            if (!profile)
                return null;
            const member = members.get(profile.userId);
            if (usingStats) {
                const winRate = Math.floor((profile.bsPokerWins / profile.bsPokerGamesPlayed) * 100);
                const skill = Math.floor((profile.bsPokerRating / profile.bsPokerGamesPlayed) * 100);
                if (invalidNumber(skill))
                    return null;
                return {
                    str: `${member.displayName}: WR: **${winRate}%**, Skill: **${skill}%**`,
                    total: skill,
                    wr: winRate,
                    id: member.id,
                };
            }
            else {
                const total = profile.mincoDollars + profile.bank;
                return {
                    str: `${member.displayName}: **${total.toLocaleString(interaction.locale)} MD**`,
                    total,
                    id: member.id,
                };
            }
        })
            .filter(x => x != null);
    }
    const formatted = profiles
        .sort((a, b) => {
        if (usingStats) {
            if (a.total === b.total) {
                return b.wr - a.wr;
            }
        }
        return b.total - a.total;
    })
        .map((val, index) => [`**${index + 1}** ${val.str}`, val.total, val.id]);
    const slices = chunkArray(formatted, chunkSize);
    const authorIndex = profiles.findIndex(e => e.id === interaction.user.id);
    const first = new ButtonBuilder()
        .setCustomId(customIds.first)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("⏪")
        .setDisabled(currentPage === 0);
    const previous = new ButtonBuilder()
        .setCustomId(customIds.prev)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("⬅️")
        .setDisabled(currentPage === 0);
    const next = new ButtonBuilder()
        .setCustomId(customIds.next)
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === slices.length - 1);
    const last = new ButtonBuilder()
        .setCustomId(customIds.last)
        .setEmoji("⏩")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === slices.length - 1);
    const length = slices.length;
    const inCirculation = profiles.reduce((acc, profile) => acc + profile.total, 0);
    const getDescription = () => {
        if (usingStats) {
            return `Win Rate, Skill\n\n${format(slices[currentPage])}`;
        }
        return `Minco Dollars in circulation: **${inCirculation.toLocaleString(interaction.locale)}**\n\n${format(slices[currentPage])}`;
    };
    const getFooter = () => `Page ${currentPage + 1}/${length} • Your leaderboard rank: ${authorIndex + 1}`;
    const lbEmbed = new EmbedBuilder()
        .setTitle("Leaderboard")
        .setColor(0xe67e22) // orange
        .setDescription(getDescription())
        .setFooter({
        text: getFooter(),
    });
    await interaction.editReply({
        embeds: [lbEmbed],
        components: [
            new ActionRowBuilder().addComponents(first, previous, next, last),
        ],
    });
    const msg = await interaction.fetchReply();
    if (length === 1)
        return;
    const collector = msg.createMessageComponentCollector({
        time: collectorTime,
        componentType: ComponentType.Button,
    });
    collector.on("collect", async (buttonInteraction) => {
        if (!buttonInteraction.inCachedGuild())
            return;
        if (buttonInteraction.user.id !== interaction.user.id) {
            await run(buttonInteraction, usingStats, true, profiles, currentPage);
            return;
        }
        switch (buttonInteraction.customId) {
            case customIds.first: {
                currentPage = 0;
                first.setDisabled();
                previous.setDisabled();
                next.setDisabled(false);
                last.setDisabled(false);
                lbEmbed.setDescription(getDescription()).setFooter({
                    text: getFooter(),
                });
                buttonInteraction
                    .update({
                    embeds: [lbEmbed],
                    components: [
                        new ActionRowBuilder().addComponents(first, previous, next, last),
                    ],
                })
                    .catch(handleMessageError);
                break;
            }
            case customIds.prev: {
                currentPage -= 1;
                next.setDisabled(false);
                last.setDisabled(false);
                if (currentPage === 0) {
                    previous.setDisabled();
                    first.setDisabled();
                }
                lbEmbed.setDescription(getDescription()).setFooter({
                    text: getFooter(),
                });
                buttonInteraction
                    .update({
                    embeds: [lbEmbed],
                    components: [
                        new ActionRowBuilder().addComponents(first, previous, next, last),
                    ],
                })
                    .catch(handleMessageError);
                break;
            }
            case customIds.next: {
                currentPage += 1;
                previous.setDisabled(false);
                first.setDisabled(false);
                if (currentPage + 1 === length) {
                    next.setDisabled();
                    last.setDisabled();
                }
                lbEmbed.setDescription(getDescription()).setFooter({
                    text: getFooter(),
                });
                buttonInteraction
                    .update({
                    embeds: [lbEmbed],
                    components: [
                        new ActionRowBuilder().addComponents(first, previous, next, last),
                    ],
                })
                    .catch(handleMessageError);
                break;
            }
            case customIds.last: {
                currentPage = length - 1;
                previous.setDisabled(false);
                first.setDisabled(false);
                next.setDisabled();
                last.setDisabled();
                lbEmbed.setDescription(getDescription()).setFooter({
                    text: getFooter(),
                });
                buttonInteraction
                    .update({
                    embeds: [lbEmbed],
                    components: [
                        new ActionRowBuilder().addComponents(first, previous, next, last),
                    ],
                })
                    .catch(handleMessageError);
                break;
            }
        }
    });
}
function format(arr) {
    if (!arr)
        return "";
    return arr.map(a => a[0]).join("\n");
}
export default leaderboard;
//# sourceMappingURL=leaderboard.js.map