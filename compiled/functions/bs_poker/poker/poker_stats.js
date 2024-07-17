import { EmbedBuilder } from "discord.js";
import Subcommand from "../../../core/Subcommand.js";
import { getProfile } from "../../../prisma/models.js";
import { colors, invalidNumber } from "../../util.js";
const pokerStats = new Subcommand()
    .setCommandData(subcommand => subcommand
    .setName("stats")
    .setDescription("View your wins and games played in BS Poker.")
    .addUserOption(option => option
    .setName("user")
    .setDescription("The user to view stats for.")
    .setRequired(false)))
    .setRun(async (interaction) => {
    const member = interaction.options.getMember("user") ?? interaction.member;
    const { bsPokerWins: wins, bsPokerGamesPlayed: gamesPlayed, bsPokerRating: rawRating, } = await getProfile(member.id);
    let winPerc = Math.floor((wins / gamesPlayed) * 100);
    if (invalidNumber(winPerc))
        winPerc = 0;
    let skill = Math.floor((rawRating / gamesPlayed) * 100);
    if (invalidNumber(skill))
        skill = 0;
    const embed = new EmbedBuilder()
        .setColor(colors.brightGreen)
        .setAuthor({
        name: `${member.displayName}'s BS Poker Stats`,
        iconURL: member.displayAvatarURL(),
    })
        .setDescription(`Wins: **${wins.toLocaleString()}**
Games Played: **${gamesPlayed.toLocaleString()}**
Win Rate: **${winPerc}%**
Raw Rating: **${rawRating.toFixed(2)}**
Skill: **${skill}%**`);
    await interaction.reply({ embeds: [embed] });
});
export default pokerStats;
//# sourceMappingURL=poker_stats.js.map