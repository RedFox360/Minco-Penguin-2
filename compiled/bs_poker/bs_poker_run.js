import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, TimestampStyles, time, } from "discord.js";
import BSPoker from "./bs_poker_class.js";
import { removeByValue } from "./bs_poker_functions.js";
const collectorTime = 30000;
const channelsWithActiveGames = [];
export default async function run(interaction) {
    if (channelsWithActiveGames.includes(interaction.channelId)) {
        await interaction.reply({
            content: "There is already an active game in this channel.",
            ephemeral: true,
        });
        return;
    }
    // Retrieving Options
    const cardsToOut = interaction.options.getInteger("cards_to_out");
    const commonCards = interaction.options.getInteger("common_cards") ?? -1;
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
            content: "The maximum number of cards to be dealt is greater than the size of the deck. Please alter the player limit.",
            ephemeral: true,
        });
        return;
    }
    const players = [interaction.user.id];
    channelsWithActiveGames.push(interaction.channelId);
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
        .setDisabled();
    const row1 = new ActionRowBuilder().addComponents(joinButton, leaveButton);
    const row2 = new ActionRowBuilder().addComponents(abortButton, startButton);
    const startTime = Math.floor((Date.now() + collectorTime) / 1000);
    const gameStartEmbed = (gameStarted = false) => new EmbedBuilder()
        .setTitle(gameStarted ? "BS Poker Game Starting" : "BS Poker")
        .setDescription(`Welcome to a game of BS Poker!
Current players: ${players.map(player => `<@${player}>`).join(", ")}` +
        (gameStarted
            ? ""
            : `\n${playerLimit - players.length} more players can join.${players.length >= 2
                ? ""
                : " Minimum 2 players required to start the game."}

<@${interaction.user.id}> is the host of the game and can abort or start it immediately.
Otherwise, the game will start ${time(startTime, TimestampStyles.RelativeTime)}`))
        .addFields({
        name: "Options",
        value: `Cards to get out: **${cardsToOut}**
Jokers in deck: **${jokerCount}**
Insurance cards in deck: **${insuranceCount}**
Starting cards: **${beginCards}**
Common cards: **${commonCards === -1 ? "Median" : commonCards}**
Allow join mid-game: **${allowJoinMidGame ? "True" : "False"}**
Use special cards: **${useSpecialCards ? "True" : "False"}**`,
    })
        .setTimestamp()
        .setColor(gameStarted ? 0x58d68d : 0x7289da)
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
    let startGame = true;
    collector.on("collect", async (buttonInteraction) => {
        if (buttonInteraction.customId === "join") {
            if (players.length >= playerLimit) {
                await buttonInteraction.reply({
                    content: "Sorry, the player limit has been reached.",
                    ephemeral: true,
                });
                return;
            }
            if (!players.includes(buttonInteraction.user.id)) {
                players.push(buttonInteraction.user.id);
                startButton.setDisabled(false);
            }
            await buttonInteraction.update({
                embeds: [gameStartEmbed()],
                components: [row1, row2],
            });
        }
        if (buttonInteraction.customId === "leave") {
            if (buttonInteraction.user.id === interaction.user.id) {
                await buttonInteraction.reply({
                    content: "You cannot leave as you are the host of the game.",
                    ephemeral: true,
                });
                return;
            }
            const index = players.indexOf(buttonInteraction.user.id);
            if (index > -1) {
                players.splice(index, 1);
            }
            if (players.length <= 1) {
                startButton.setDisabled(true);
            }
            await buttonInteraction.update({
                embeds: [gameStartEmbed()],
                components: [row1, row2],
            });
        }
        if (buttonInteraction.customId === "abort") {
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({
                    content: "Only the host can abort the game.",
                    ephemeral: true,
                });
                return;
            }
            await buttonInteraction.update({
                content: "Game aborted by host.",
                embeds: [],
                components: [],
            });
            startGame = false;
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
            await buttonInteraction.update({
                embeds: [gameStartEmbed(true)],
                components: [],
            });
            collector.stop();
        }
    });
    collector.on("end", async () => {
        if (!startGame) {
            removeByValue(channelsWithActiveGames, interaction.channelId);
            return;
        }
        if (players.length <= 1) {
            await msg.edit({
                content: "Game aborted due to insufficient players.",
                embeds: [],
                components: [],
            });
            removeByValue(channelsWithActiveGames, interaction.channelId);
            return;
        }
        await msg.edit({
            embeds: [gameStartEmbed(true)],
            components: [],
        });
        shuffleArrayInPlace(players);
        const game = new BSPoker(interaction, players, cardsToOut, commonCards, jokerCount, insuranceCount, beginCards, allowJoinMidGame, playerLimit, useSpecialCards, channelsWithActiveGames);
        game.gameLogic().catch(e => {
            interaction.channel.send("Sorry, but an unknown error occured while running the game and the game has aborted.");
            console.error(e);
            removeByValue(channelsWithActiveGames, interaction.channelId);
        });
    });
}
function shuffleArrayInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}
//# sourceMappingURL=bs_poker_run.js.map