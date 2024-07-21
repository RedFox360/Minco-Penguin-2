import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} from "discord.js";
import { type Character, characters } from "./characters.js";
import { colors, randomElement } from "../util.js";

type CustomId = `claim_${string}`;
export const customIds = {
	claim: "claim_character_tnt",
};
const claimCharacterButton = new ButtonBuilder()
	.setCustomId(customIds.claim)
	.setLabel("Battle")
	.setStyle(ButtonStyle.Danger);

export const claimCharacterRow =
	new ActionRowBuilder<ButtonBuilder>().addComponents(claimCharacterButton);

export function randomCharacter() {
	return randomElement(characters);
}

export function customIdToId(customId: CustomId): string {
	return customId.slice(6);
}

export function characterSpawnMessage(character: Character): {
	embed: EmbedBuilder;
	row: ActionRowBuilder<ButtonBuilder>;
	customId: CustomId;
} {
	const customId: CustomId = `claim_${character.id}`;
	const button = new ButtonBuilder()
		.setCustomId(customId)
		.setLabel("Battle")
		.setStyle(ButtonStyle.Primary);
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
	return {
		embed: new EmbedBuilder()
			.setTitle("A new character has spawned!")
			.setDescription(`The character ${character.name} has spawned!`)
			.setColor(colors.green)
			.setImage(
				"https://t4.ftcdn.net/jpg/05/17/53/57/360_F_517535712_q7f9QC9X6TQxWi6xYZZbMmw5cnLMr279.jpg"
			),
		row,
		customId,
	};
}
