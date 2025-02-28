import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, userMention, } from "discord.js";
import BSPoker from "./classes/BSPokerGame.js";
import { removeByValue, msToRelTimestamp, shuffleArray, hasAdminForGames, isAlt, } from "../util.js";
import { getProfile } from "../../prisma/models.js";
import { colors } from "../util.js";
import { bsPokerTeams, channelsWithActiveGames } from "../../main.js";
import OptionManager, { OptionCreationError, Preset1, } from "./classes/OptionManager.js";
const collectorTime = 300000;
const customIds = {
    join: "join_bspoker_s",
    leave: "leave_bspoker_s",
    abort: "abort_bspoker_s",
    start: "start_bspoker_s",
};
const customIdValues = Object.values(customIds);
export default async function bsPokerRun(interaction, usePresetOptions = false) {
    if (channelsWithActiveGames.has(interaction.channelId)) {
        await interaction.reply({
            content: "There is already an active game in this channel.",
            ephemeral: true,
        });
        return;
    }
    // Retrieving Options
    let options;
    try {
        options = new OptionManager(usePresetOptions ? Preset1 : interaction.options);
    }
    catch (e) {
        if (e instanceof OptionCreationError) {
            await interaction.reply({
                content: e.message,
                ephemeral: true,
            });
        }
        else {
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
    const row1 = new ActionRowBuilder().addComponents(joinButton, leaveButton);
    const row2 = new ActionRowBuilder().addComponents(abortButton, startButton);
    const betDisplay = options.startingBet
        ? `Bet to Join: **${options.startingBet} MD**`
        : "**No bet required.**";
    const startTime = msToRelTimestamp(collectorTime);
    const optionsFieldValue = options.display();
    const gameStartEmbed = (gameStarted = false) => {
        let text;
        if (gameStarted) {
            text = betDisplay;
        }
        else {
            const numPlayersCanJoin = options.playerLimit - players.length;
            let playerLimitInfo = "";
            if (players.length < 2)
                playerLimitInfo = " Minimum 2 players required to start the game.";
            text = `${numPlayersCanJoin} more players can join.${playerLimitInfo}
${betDisplay}
${interaction.user} is the host of the game and can abort or start it immediately.
Otherwise, the game will start ${startTime}`;
        }
        const currentPlayers = players.map(userMention).join(", ");
        return new EmbedBuilder()
            .setTitle(gameStarted ? "BS Poker Game Started" : "BS Poker")
            .setDescription(`Welcome to a game of BS Poker!
Current players: ${currentPlayers}
${text}`)
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
    };
    const msg = await interaction.reply({
        embeds: [gameStartEmbed()],
        components: [row1, row2],
        fetchReply: false,
    });
    const collector = msg.createMessageComponentCollector({
        filter: i => customIdValues.includes(i.customId),
        time: collectorTime,
        componentType: ComponentType.Button,
    });
    collector.on("collect", async (buttonInteraction) => {
        switch (buttonInteraction.customId) {
            case customIds.join: {
                if (players.length >= options.playerLimit) {
                    await buttonInteraction.reply({
                        content: "Sorry, the player limit has been reached.",
                        ephemeral: true,
                    });
                    return;
                }
                if (isAlt(buttonInteraction.member)) {
                    await buttonInteraction.reply({
                        content: "Alt accounts may not join.",
                        ephemeral: true,
                    });
                }
                const joinerProfile = await getProfile(buttonInteraction.user.id);
                if (options.startingBet &&
                    joinerProfile.mincoDollars < options.startingBet) {
                    await buttonInteraction.reply({
                        content: `You do not have enough Minco Dollars to join this game (the bet is **${options.startingBet} MD**).`,
                        ephemeral: true,
                    });
                    return;
                }
                if (players.includes(buttonInteraction.user.id)) {
                    buttonInteraction.deferUpdate();
                }
                else {
                    players.push(buttonInteraction.user.id);
                    startButton.setDisabled(false);
                    buttonInteraction.update({
                        embeds: [gameStartEmbed()],
                        components: [row1, row2],
                    });
                }
                return;
            }
            case customIds.leave: {
                if (buttonInteraction.user.id === interaction.user.id) {
                    await buttonInteraction.reply({
                        content: "You may not leave as you are the host of the game.",
                        ephemeral: true,
                    });
                    return;
                }
                const existed = removeByValue(players, buttonInteraction.user.id);
                if (existed) {
                    if (players.length <= 1)
                        startButton.setDisabled(true);
                    buttonInteraction.update({
                        embeds: [gameStartEmbed()],
                        components: [row1, row2],
                    });
                }
                else {
                    buttonInteraction.deferUpdate();
                }
                return;
            }
            case customIds.abort: {
                if (!hasAdminForGames(buttonInteraction.user.id, buttonInteraction.member.permissions, interaction.user.id)) {
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
                collector.stop("game_abort");
                return;
            }
            case customIds.start: {
                if (!hasAdminForGames(buttonInteraction.user.id, buttonInteraction.member.permissions, interaction.user.id)) {
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
                return;
            }
        }
    });
    collector.on("end", async (_, reason) => {
        if (reason === "game_abort") {
            channelsWithActiveGames.delete(interaction.channelId);
            return;
        }
        if (players.length <= 1) {
            interaction.editReply({
                content: "Game aborted due to insufficient players.",
                embeds: [],
                components: [],
            });
            channelsWithActiveGames.delete(interaction.channelId);
            return;
        }
        interaction.editReply({
            embeds: [gameStartEmbed(true)],
            components: [],
        });
        bsPokerTeams.set(interaction.channelId, players.map(x => [x]));
        shuffleArray(players);
        const game = new BSPoker(interaction.channel, interaction.user.id, players, options);
        game.gameLogic().catch(e => {
            interaction.channel.send("Sorry, an error has occurred and the game has aborted.");
            console.error(e);
            channelsWithActiveGames.delete(interaction.channelId);
            bsPokerTeams.delete(interaction.channelId);
        });
    });
}
//# sourceMappingURL=bs_poker_run.js.map