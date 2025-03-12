import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, } from "discord.js";
import { customIds, customIdValues, gameLength, timeToChooseHalfSuitToMakeCall, } from "../fish_types.js";
import { msToRelTimestamp } from "../../util.js";
import { halfSuitSelectMenuRow } from "../fish_functions.js";
const callButton = new ButtonBuilder()
    .setCustomId(customIds.call)
    .setLabel("Call")
    .setStyle(ButtonStyle.Danger);
const viewCardsButton = new ButtonBuilder()
    .setCustomId(customIds.viewCards)
    .setLabel("View Cards")
    .setStyle(ButtonStyle.Secondary);
const bottomRow = new ActionRowBuilder().addComponents(callButton, viewCardsButton);
function interpolatePlayerIdToCustomId(id) {
    return `ask_fish${id}`;
}
function assertCustomIdIsAskFish(customId) {
    return /^ask_fish\d+$/.test(customId);
}
function extrapolateCustomIdToPlayerId(customId) {
    return customId.slice(8);
}
export default class NotificationManager {
    constructor(players, channel) {
        this.players = players;
        this.channel = channel;
        this.ongoingAskId = null;
        this.ongoingCall = false;
    }
    setupCollectors() {
        this.mcompColl = this.channel.createMessageComponentCollector({
            time: gameLength,
            componentType: ComponentType.Button,
            filter: i => customIdValues.includes(i.customId),
        });
        this.mcompColl.on("collect", (buttonInteraction) => {
            this.buttonCollect(buttonInteraction);
        });
    }
    async onCall(buttonInteraction) {
        const timeUp = msToRelTimestamp(timeToChooseHalfSuitToMakeCall);
        const msg = await buttonInteraction.reply({
            content: `Please use the menu below to select a half suit to call ${timeUp}.`,
            components: [halfSuitSelectMenuRow],
        });
        msg.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: timeToChooseHalfSuitToMakeCall,
            filter: i => i.customId === "call_fish" && i.user.id === buttonInteraction.user.id,
        });
        this.ongoingCall = true;
    }
    async buttonCollect(buttonInteraction) {
        if (assertCustomIdIsAskFish(buttonInteraction.customId)) {
            const playerId = extrapolateCustomIdToPlayerId(buttonInteraction.customId);
            if (!this.players.has(playerId))
                return;
            this.ongoingAskId = playerId;
            const timeUp = msToRelTimestamp(timeToChooseHalfSuitToMakeCall);
            await buttonInteraction.reply({
                content: `Please type the card you wish to ask <@${playerId}> for ${timeUp}.`,
            });
            return;
        }
        if (buttonInteraction.customId === customIds.call) {
            this.onCall(buttonInteraction);
            return;
        }
        if (buttonInteraction.customId === customIds.viewCards) {
            await buttonInteraction.reply({
                content: `**Your cards:**\n${this.players.currentPlayer.formatHand()}`,
                ephemeral: true,
            });
            return;
        }
    }
    turn() {
        this.ongoingAskId = null;
        const opponents = this.players.currentPlayer.team === 0
            ? this.players.team1
            : this.players.team0;
        const row = new ActionRowBuilder();
        for (const player of opponents.values()) {
            row.addComponents(new ButtonBuilder()
                .setLabel(player.user.username)
                .setCustomId(interpolatePlayerIdToCustomId(player.id))
                .setStyle(ButtonStyle.Secondary));
        }
        return this.channel.send({
            content: `<@${this.players.currentPlayer}>, it is your turn. Please select a member of the opposing team using the buttons below, then type the card you wish to ask them for.`,
            components: [row, bottomRow],
        });
    }
}
//# sourceMappingURL=NotificationManager.js.map