import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	userMention,
} from "discord.js";
import {
	formatDeck,
	suitToSuitValue,
	symbolToValue,
} from "../cards/basic_card_functions";
import { AnyCard, emojiRaw, JICard } from "../cards/basic_card_types";
import {
	cardToHalfSuit,
	customIds,
	HalfSuit,
	HalfSuitCall,
	HalfSuitCallCollection,
} from "./fish_types";
import FishPlayer from "./classes/FishPlayer";

export function extrapolateCard(ask: string): JICard | null {
	const [valueGiven, suitGiven] = ask.split(" ");
	const value = symbolToValue(valueGiven);
	if (!value) return null;
	if (value === 1) {
		return { suit: "j", value: 1 };
	} else if (value === 15) {
		return { suit: "i", value: 15 };
	}
	const suit = suitToSuitValue(suitGiven);
	if (!suit) return null;
	return { suit, value };
}

export function deckHasCard(deck: readonly AnyCard[], card: AnyCard): boolean {
	return deck.some(c => c.suit === card.suit && c.value === card.value);
}

export function hasOtherCardInSameHalfSuit(
	deck: readonly JICard[],
	card: JICard
): boolean {
	if (card.value === 8 || card.value === 1 || card.value === 15) {
		return deck.some(c => c.value === 8 || c.value === 1 || c.value === 15);
	}
	if (card.value > 8) {
		return deck.some(
			card => card.suit === card.suit && card.value > 8 && card.value < 15
		);
	}
	if (card.value < 8) {
		return deck.some(
			card => card.suit === card.suit && card.value < 8 && card.value > 1
		);
	}
}

const halfSuitSelectMenu = new StringSelectMenuBuilder()
	.setCustomId(customIds.callFishSelect)
	.addOptions(
		{
			label: "High Hearts",
			value: HalfSuit.HighHearts,
			emoji: emojiRaw.hearts,
		},
		{
			label: "Low Hearts",
			value: HalfSuit.LowHearts,
			emoji: emojiRaw.hearts,
		},
		{
			label: "High Diamonds",
			value: HalfSuit.HighDiamonds,
			emoji: emojiRaw.diamonds,
		},
		{
			label: "Low Diamonds",
			value: HalfSuit.LowDiamonds,
			emoji: emojiRaw.diamonds,
		},
		{
			label: "High Clubs",
			value: HalfSuit.HighClubs,
			emoji: emojiRaw.clubs,
		},
		{
			label: "Low Clubs",
			value: HalfSuit.LowClubs,
			emoji: emojiRaw.clubs,
		},
		{
			label: "High Spades",
			value: HalfSuit.HighSpades,
			emoji: emojiRaw.spades,
		},
		{
			label: "Low Spades",
			value: HalfSuit.LowSpades,
			emoji: emojiRaw.spades,
		},
		{
			label: "Eights, Jokers, Insurances",
			value: HalfSuit.EJI,
			emoji: emojiRaw.joker,
		}
	)
	.setMaxValues(1);

const halfSuitSelectMenuDisabled = new StringSelectMenuBuilder(
	halfSuitSelectMenu.toJSON()
).setDisabled(true);

export const halfSuitSelectMenuRow =
	new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		halfSuitSelectMenu
	);
export const halfSuitSelectMenuDisabledRow =
	new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		halfSuitSelectMenuDisabled
	);

export function part6arrTo3Arr<T>(arr: readonly T[]): readonly T[][] {
	const arr1 = arr.slice(0, 3);
	const arr2 = arr.slice(3, 6);
	return [arr1, arr2];
}

export function formatHalfSuitCall(call: HalfSuitCallCollection) {
	const arr = call.map((cards, id) => {
		if (cards.length === 0) return `${userMention(id)}: None`;
		const formattedCards = formatDeck(cards);
		return `${userMention(id)}\n${formattedCards}`;
	});
	return arr.join("\n");
}

/**
 * cards in arr1 that are not disjoint with the cards in arr2
 */
export function nonDisjointCards(
	arr1: readonly JICard[],
	arr2: readonly JICard[]
) {
	const suits = new Set(arr2.map(c => cardToHalfSuit(c)));
	const matchingCards = arr1.filter(c => suits.has(cardToHalfSuit(c)));
	const nonMatchingCards = arr1.filter(c => !suits.has(cardToHalfSuit(c)));
	return { matchingCards, nonMatchingCards };
}
