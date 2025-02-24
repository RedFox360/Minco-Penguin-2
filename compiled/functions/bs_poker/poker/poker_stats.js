import { EmbedBuilder } from "discord.js";
import Subcommand from "../../../core/Subcommand.js";
import { getProfile } from "../../../prisma/models.js";
import { colors, invalidNumber } from "../../util.js";
function perc(a, b) {
    const result = Math.round((a / b) * 100);
    if (invalidNumber(result))
        return "0";
    return result.toFixed(2);
}
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
    const profile = await getProfile(member.id);
    const winPerc = perc(profile.bsPokerWins, profile.bsPokerGamesPlayed);
    const skill = perc(profile.bsPokerRating, profile.bsPokerGamesPlayed);
    const bsAccuracy = perc(profile.bsSuccesses, profile.bsCount);
    const embed = new EmbedBuilder()
        .setColor(colors.brightGreen)
        .setAuthor({
        name: `${member.displayName}'s BS Poker Stats`,
        iconURL: member.displayAvatarURL(),
    })
        .setDescription(`Wins: **${profile.bsPokerWins.toLocaleString()}**
Games Played: **${profile.bsPokerGamesPlayed.toLocaleString()}**
Win Rate: **${winPerc}%**
Raw Rating: **${profile.bsPokerRating.toFixed(2)}**
Skill: **${skill}%**
BS Accuracy: **${bsAccuracy}%**`);
    await interaction.reply({ embeds: [embed] });
});
export default pokerStats;
//# sourceMappingURL=poker_stats.js.map