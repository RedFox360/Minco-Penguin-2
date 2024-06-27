import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, userMention, } from "discord.js";
import BSPoker from "./bs_poker_class.js";
import { removeByValue, msToRelTimestamp, shuffleArrayInPlace, handleMessageError, } from "../util.js";
import { getProfile } from "../../prisma/models.js";
import { colors } from "../util.js";
import { bsPokerTeams, channelsWithActiveGames } from "../../main.js";
const collectorTime = 60000;
export default async function bsPokerRun(interaction) {
    if (channelsWithActiveGames.has(interaction.channelId)) {
        await interaction.reply({
            content: "There is already an active game in this channel.",
            ephemeral: true,
        });
        return;
    }
    // Retrieving Options
    const cardsToOut = interaction.options.getInteger("cards_to_out");
    const commonCards = interaction.options.getInteger("common_cards") ?? -1;
    const startingBet = interaction.options.getInteger("bet") ?? 0;
    const jokerCount = interaction.options.getInteger("joker_count") ?? 2;
    const insuranceCount = interaction.options.getInteger("insurance_count") ?? 1;
    const useSpecialCards = interaction.options.getBoolean("use_special_cards") ?? false;
    const deckSize = 52 + jokerCount + insuranceCount + (useSpecialCards ? 2 : 0);
    const beginCards = interaction.options.getInteger("begin_cards") ?? 1;
    const maxCommonCards = commonCards === -1 ? cardsToOut - 1 : commonCards;
    const maxPlayerLimit = Math.floor((deckSize - maxCommonCards) / (cardsToOut - 1));
    const playerLimit = interaction.options.getInteger("player_limit") ?? maxPlayerLimit;
    const allowJoinMidGame = interaction.options.getBoolean("allow_join_mid_game") ?? true;
    if (beginCards >= cardsToOut) {
        await interaction.reply({
            content: "The beginning number of cards must be less than the number of cards to be out.",
            ephemeral: true,
        });
        return;
    }
    if (playerLimit > maxPlayerLimit) {
        await interaction.reply({
            content: `The maximum number of cards to be dealt is greater than the size of the deck.
Please decrease the player limit to a value less than or equal to ${maxPlayerLimit}.`,
            ephemeral: true,
        });
        return;
    }
    const hostProfile = await getProfile(interaction.user.id);
    if (hostProfile.mincoDollars < startingBet) {
        await interaction.reply({
            content: `You do not have enough Minco Dollars to start this game with a bet of ${startingBet}.`,
            ephemeral: true,
        });
        return;
    }
    const players = [interaction.user.id];
    channelsWithActiveGames.add(interaction.channelId);
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
        .setDisabled(true);
    const row1 = new ActionRowBuilder().addComponents(joinButton, leaveButton);
    const row2 = new ActionRowBuilder().addComponents(abortButton, startButton);
    const betDisplay = startingBet
        ? `Bet to Join: **${startingBet} MD**`
        : "**No bet required.**";
    const startTime = msToRelTimestamp(collectorTime);
    const optionsFieldValue = `Cards to get out: **${cardsToOut}**
Jokers in deck: **${jokerCount}**
Insurance cards in deck: **${insuranceCount}**
Starting cards: **${beginCards}**
Common cards: **${commonCards === -1 ? "Median" : commonCards}**
Allow join mid-game: **${allowJoinMidGame ? "True" : "False"}**
Use special cards: **${useSpecialCards ? "True" : "False"}**`;
    const gameStartEmbed = (gameStarted = false) => new EmbedBuilder()
        .setTitle(gameStarted ? "BS Poker Game Started" : "BS Poker")
        .setDescription(`Welcome to a game of BS Poker!
Current players: ${players.map(userMention).join(", ")}\n` +
        (gameStarted
            ? betDisplay
            : `${playerLimit - players.length} more players can join.${players.length >= 2
                ? ""
                : " Minimum 2 players required to start the game."}
${betDisplay}
<@${interaction.user.id}> is the host of the game and can abort or start it immediately.
Otherwise, the game will start ${startTime}`))
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
        filter: i => i.customId === "join" ||
            i.customId === "leave" ||
            i.customId === "abort" ||
            i.customId === "start",
        time: collectorTime,
        componentType: ComponentType.Button,
    });
    let shouldBeginGame = true;
    collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.customId === "join") {
            if (players.length >= playerLimit) {
                await buttonInteraction.reply({
                    content: "Sorry, the player limit has been reached.",
                    ephemeral: true,
                });
                return;
            }
            if (startingBet) {
                const joinerProfile = await getProfile(buttonInteraction.user.id);
                if (joinerProfile.mincoDollars < startingBet) {
                    await buttonInteraction.reply({
                        content: `You do not have enough Minco Dollars to join this game (the bet is **${startingBet} MD**).`,
                        ephemeral: true,
                    });
                    return;
                }
            }
            if (!players.includes(buttonInteraction.user.id)) {
                players.push(buttonInteraction.user.id);
                startButton.setDisabled(false);
            }
            buttonInteraction
                .update({
                embeds: [gameStartEmbed()],
                components: [row1, row2],
            })
                .catch(handleMessageError);
        }
        if (buttonInteraction.customId === "leave") {
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
            buttonInteraction
                .update({
                embeds: [gameStartEmbed()],
                components: [row1, row2],
            })
                .catch(handleMessageError);
        }
        if (buttonInteraction.customId === "abort") {
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({
                    content: "Only the host can abort the game.",
                    ephemeral: true,
                });
                return;
            }
            buttonInteraction
                .update({
                content: "Game aborted by host.",
                embeds: [],
                components: [],
            })
                .catch(handleMessageError);
            shouldBeginGame = false;
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
            buttonInteraction
                .update({
                embeds: [gameStartEmbed(true)],
                components: [],
            })
                .catch(handleMessageError);
            collector.stop();
        }
    });
    collector.on("end", async () => {
        if (!shouldBeginGame) {
            channelsWithActiveGames.delete(interaction.channelId);
            return;
        }
        if (players.length <= 1) {
            msg
                .edit({
                content: "Game aborted due to insufficient players.",
                embeds: [],
                components: [],
            })
                .catch(handleMessageError);
            channelsWithActiveGames.delete(interaction.channelId);
            return;
        }
        msg
            .edit({
            embeds: [gameStartEmbed(true)],
            components: [],
        })
            .catch(handleMessageError);
        shuffleArrayInPlace(players);
        bsPokerTeams.set(interaction.channelId, players.map(x => [x]));
        const game = new BSPoker(interaction, players, cardsToOut, startingBet, commonCards, jokerCount, insuranceCount, beginCards, allowJoinMidGame, playerLimit, useSpecialCards);
        game.gameLogic().catch(e => {
            interaction.channel.send("Sorry, but an unknown error occured while running the game and the game has aborted.");
            console.error(e);
            channelsWithActiveGames.delete(interaction.channelId);
        });
    });
}
//# sourceMappingURL=bs_poker_run.js.map