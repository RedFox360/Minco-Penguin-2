import { ActionRowBuilder, StringSelectMenuBuilder, userMention, } from "discord.js";
import { formatDeck, suitToSuitValue, symbolToValue, } from "../cards/basic_card_functions.js";
import { emojiRaw, } from "../cards/basic_card_types.js";
import { cardToHalfSuit, customIds, HalfSuit, } from "./fish_types.js";
export function extrapolateCard(ask) {
    const [valueGiven, suitGiven] = ask.split(" ");
    const value = symbolToValue(valueGiven);
    if (!value)
        return null;
    if (value === 1) {
        return { suit: "j", value: 1 };
    }
    else if (value === 15) {
        return { suit: "i", value: 15 };
    }
    const suit = suitToSuitValue(suitGiven);
    if (!suit)
        return null;
    return { suit, value };
}
export function deckHasCard(deck, card) {
    return deck.some(c => c.suit === card.suit && c.value === card.value);
}
export function hasOtherCardInSameHalfSuit(deck, card) {
    if (card.value === 8 || card.value === 1 || card.value === 15) {
        return deck.some(c => c.value === 8 || c.value === 1 || c.value === 15);
    }
    if (card.value > 8) {
        return deck.some(c => c.suit === card.suit && c.value > 8 && c.value < 15);
    }
    if (card.value < 8) {
        return deck.some(c => c.suit === card.suit && c.value < 8 && c.value > 1);
    }
}
const halfSuitSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(customIds.callFishSelect)
    .addOptions({
    label: "High Hearts",
    value: HalfSuit.HighHearts,
    emoji: emojiRaw.hearts,
}, {
    label: "Low Hearts",
    value: HalfSuit.LowHearts,
    emoji: emojiRaw.hearts,
}, {
    label: "High Diamonds",
    value: HalfSuit.HighDiamonds,
    emoji: emojiRaw.diamonds,
}, {
    label: "Low Diamonds",
    value: HalfSuit.LowDiamonds,
    emoji: emojiRaw.diamonds,
}, {
    label: "High Clubs",
    value: HalfSuit.HighClubs,
    emoji: emojiRaw.clubs,
}, {
    label: "Low Clubs",
    value: HalfSuit.LowClubs,
    emoji: emojiRaw.clubs,
}, {
    label: "High Spades",
    value: HalfSuit.HighSpades,
    emoji: emojiRaw.spades,
}, {
    label: "Low Spades",
    value: HalfSuit.LowSpades,
    emoji: emojiRaw.spades,
}, {
    label: "Eights, Jokers, Insurances",
    value: HalfSuit.EJI,
    emoji: emojiRaw.joker,
})
    .setMaxValues(1);
const halfSuitSelectMenuDisabled = new StringSelectMenuBuilder(halfSuitSelectMenu.toJSON()).setDisabled(true);
export const halfSuitSelectMenuRow = new ActionRowBuilder().addComponents(halfSuitSelectMenu);
export const halfSuitSelectMenuDisabledRow = new ActionRowBuilder().addComponents(halfSuitSelectMenuDisabled);
export function part6arrTo3Arr(arr) {
    const arr1 = arr.slice(0, 3);
    const arr2 = arr.slice(3, 6);
    return [arr1, arr2];
}
export function formatHalfSuitCall(call) {
    const arr = call.map((cards, id) => {
        if (cards.length === 0)
            return `${userMention(id)}: None`;
        const formattedCards = formatDeck(cards);
        return `${userMention(id)}\n${formattedCards}`;
    });
    return arr.join("\n");
}
/**
 * cards in arr1 that are not disjoint with the cards in arr2
 */
export function nonDisjointCards(arr1, arr2) {
    const suits = new Set(arr2.map(c => cardToHalfSuit(c)));
    const matchingCards = arr1.filter(c => suits.has(cardToHalfSuit(c)));
    const nonMatchingCards = arr1.filter(c => !suits.has(cardToHalfSuit(c)));
    return { matchingCards, nonMatchingCards };
}
export function isEJI(a) {
    return a === 8 || a === 1 || a === 15;
}
//# sourceMappingURL=fish_functions.js.map