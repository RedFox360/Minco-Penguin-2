import { Message } from "discord.js";
import {
	Call,
	ClownState,
	ExtCard,
	ExtValue,
	HandRank,
} from "../bs_poker_types.js";
import { invalidNumber, replyThenDelete } from "../../util.js";
import { formatCall, isHigher } from "../bs_poker_functions.js";
import { emoji } from "../../cards/basic_card_types.js";
import OptionManager from "./OptionManager.js";
import StateManager from "./StateManager.js";

export default class CallValidator {
	public constructor(
		private readonly options: OptionManager,
		private readonly state: StateManager
	) {}

	public validateAndRespond(call: Call, message: Message): boolean {
		if (!call || invalidNumber(call.call) || (call.call as number) === -1) {
			// Call could not be parsed
			return false;
		}
		if (this.options.useClown) {
			const hasClown = this.state.currentPlayer.hand?.some(
				c => c.suit === "rj"
			);
			if (hasClown && this.state.clowned === ClownState.ClownedAndCalled) {
				message.reply({
					content: `${emoji.clown} You have clowned this round and now it is your turn. You must call BS. ${emoji.clown}`,
				});
				return false;
			}
		}
		if (!this.options.nonStandard) {
			if (
				call.call === HandRank.TriplePair ||
				call.call === HandRank.DoubleFlush ||
				call.call === HandRank.DoubleTriple
			) {
				replyThenDelete(
					message,
					`Nonstandard calls (Triple pair, double flush, and double triple) are not allowed in this game (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return false;
			}
		}
		if (this.state.currentCall) {
			if (!isHigher(call, this.state.currentCall.call)) {
				replyThenDelete(
					message,
					`Your call is not higher than the current call (${formatCall(
						this.state.currentCall.call
					)}). Please try again.`
				);
				return false;
			}
		}
		if (
			call.call === HandRank.DoublePair ||
			call.call === HandRank.DoubleTriple ||
			call.call === HandRank.FullHouse
		) {
			const highCards = call.high as [ExtValue, ExtValue];
			if (highCards[0] === highCards[1]) {
				replyThenDelete(
					message,
					`Double pairs, triples, and full houses must have 2 different values (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return false;
			}
		}
		if (call.call === HandRank.TriplePair) {
			const highCards = call.high as [ExtValue, ExtValue, ExtValue];
			if (
				highCards[0] === highCards[1] ||
				highCards[0] === highCards[2] ||
				highCards[1] === highCards[2]
			) {
				replyThenDelete(
					message,
					`Triple pairs must have 3 unique values (Your call: ${formatCall(
						call
					)}). Please try again.`
				);

				return false;
			}
		}
		if (
			call.call === HandRank.StraightFlush &&
			this.options.insuranceCount > 1 &&
			call.high.value === 15
		) {
			replyThenDelete(
				message,
				`Sorry, but Insurance-High Straight Flushes are not allowed when there are multiple insurances in the deck (Your call: ${formatCall(
					call
				)}). Please try again.`
			);
			return false;
		}
		if (call.call === HandRank.DoubleFlush) {
			const highCards = call.high as [ExtCard, ExtCard];
			if (highCards[0].suit === highCards[1].suit) {
				replyThenDelete(
					message,
					`Double flushes must have different suits (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return false;
			}

			if (
				this.options.insuranceCount < 2 &&
				highCards[0].value === highCards[1].value &&
				highCards[0].value === 15
			) {
				replyThenDelete(
					message,
					`There are not enough insurance cards in the deck for a double insurance call (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return false;
			}

			if (highCards.some(x => x.value === 1)) {
				replyThenDelete(
					message,
					`Jokers may not be used as a high card in flush calls (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return false;
			}
		}
		if (call.call === HandRank.Flush) {
			if (call.high.value === 1) {
				replyThenDelete(
					message,
					`Jokers may not be used as a high card in flush calls (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return false;
			}
		}
		return true;
	}
}
