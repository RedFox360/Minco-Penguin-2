import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, } from "discord.js";
import { characters } from "./characters.js";
import { colors, randomElement } from "../util.js";
export const customIds = {
    claim: "claim_character_tnt",
};
const claimCharacterButton = new ButtonBuilder()
    .setCustomId(customIds.claim)
    .setLabel("Battle")
    .setStyle(ButtonStyle.Danger);
export const claimCharacterRow = new ActionRowBuilder().addComponents(claimCharacterButton);
export function randomCharacter() {
    return randomElement(characters);
}
function customIdToId(customId) {
    return customId.slice(6);
}
export function characterSpawnMessage(character) {
    const customId = `claim_${character.id}`;
    const button = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel("Battle")
        .setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(button);
    return {
        embed: new EmbedBuilder()
            .setTitle("A new character has spawned!")
            .setDescription(`The character ${character.name} has spawned!`)
            .setColor(colors.green)
            .setImage("https://t4.ftcdn.net/jpg/05/17/53/57/360_F_517535712_q7f9QC9X6TQxWi6xYZZbMmw5cnLMr279.jpg"),
        row,
        customId,
    };
}
//# sourceMappingURL=character_util.js.map