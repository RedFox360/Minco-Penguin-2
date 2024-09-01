import { ClownState, HandRank } from "../bs_poker_types.js";
import { invalidNumber, replyThenDelete } from "../../util.js";
import { formatCall, isHigher } from "../bs_poker_functions.js";
import { emoji } from "../../cards/basic_card_types.js";
export default class CallValidator {
    constructor(options, state, players) {
        this.options = options;
        this.state = state;
        this.players = players;
    }
    validateAndRespond(call, message) {
        if (!call || invalidNumber(call.call) || call.call === -1) {
            // Call could not be parsed
            return false;
        }
        if (this.options.useClown &&
            this.state.clowned === ClownState.ClownedAndCalled) {
            const hasClown = this.players.currentPlayer.hand?.some(c => c.suit === "rj");
            if (hasClown) {
                message.reply({
                    content: `${emoji.clown} You have used a Clown Joker this round and now it is your turn. You must call BS. ${emoji.clown}`,
                });
                return false;
            }
        }
        if (!this.options.nonStandard) {
            if (call.call === HandRank.TriplePair ||
                call.call === HandRank.DoubleFlush ||
                call.call === HandRank.DoubleTriple) {
                replyThenDelete(message, `Nonstandard calls (Triple pair, double flush, and double triple) are not allowed in this game (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
        }
        if (this.state.currentCall) {
            if (!isHigher(call, this.state.currentCall.call)) {
                replyThenDelete(message, `Your call (${formatCall(call)}) is not higher than the current call (${formatCall(this.state.currentCall.call)}). Please try again.`);
                return false;
            }
        }
        if (call.call === HandRank.DoublePair ||
            call.call === HandRank.DoubleTriple ||
            call.call === HandRank.FullHouse) {
            if (call.high[0] === call.high[1]) {
                replyThenDelete(message, `Double pairs, triples, and full houses must have 2 different values (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
        }
        if (call.call === HandRank.TriplePair) {
            if (call.high[0] === call.high[1] ||
                call.high[0] === call.high[2] ||
                call.high[1] === call.high[2]) {
                replyThenDelete(message, `Triple pairs must have 3 unique values (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
        }
        if (call.call === HandRank.StraightFlush &&
            this.options.trueInsuranceCount > 1 &&
            call.high.value === 15) {
            replyThenDelete(message, `Sorry, but Insurance-High Straight Flushes are not allowed when there are multiple insurances in the deck (Your call: ${formatCall(call)}). Please try again.`);
            return false;
        }
        if (call.call === HandRank.DoubleFlush) {
            if (call.high[0].suit === call.high[1].suit) {
                replyThenDelete(message, `Double flushes must have different suits (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
            if (this.options.trueInsuranceCount < 2 &&
                call.high[0].value === call.high[1].value &&
                call.high[0].value === 15) {
                replyThenDelete(message, `There are not enough insurance cards in the deck for a double insurance call (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
            if (call.high[0].value === 1 || call.high[1].value === 1) {
                replyThenDelete(message, `Jokers may not be used as a high card in flush calls (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
        }
        if (call.call === HandRank.Flush) {
            if (call.high.value === 1) {
                replyThenDelete(message, `Jokers may not be used as a high card in flush calls (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
        }
        return true;
    }
}
//# sourceMappingURL=CallValidator.js.map