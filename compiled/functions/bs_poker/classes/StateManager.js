import { formatCall } from "../bs_poker_functions.js";
export default class StateManager {
    constructor(players) {
        this.players = players;
        this.roundInProgress = false;
        this.callsOpen = true;
        this.bsCalled = false;
        this.aborted = false;
        this.bxOpen = false;
        this.last3CallsTracker = [true, true, true];
        this._currentCall = null;
        this._round = 0;
        this._currPlayerIdx = 0;
    }
    get currentCall() {
        return this._currentCall;
    }
    get round() {
        return this._round;
    }
    setCurrentCall(call) {
        this._currentCall = {
            call,
            player: this.currentPlayer,
        };
    }
    get currentPlayerIndex() {
        if (this._currPlayerIdx < 0 || this._currPlayerIdx >= this.players.size) {
            return 0;
        }
        else {
            return this._currPlayerIdx;
        }
    }
    set currentPlayerIndex(newIdx) {
        if (newIdx < 0 || newIdx >= this.players.size) {
            this._currPlayerIdx = 0;
        }
        else {
            this._currPlayerIdx = newIdx;
        }
    }
    get currentPlayer() {
        return this.players.at(this.currentPlayerIndex);
    }
    forward() {
        this.currentPlayerIndex += 1;
    }
    setIdxToIdxOf(playerId) {
        this.currentPlayerIndex = Array.from(this.players.keys()).indexOf(playerId);
    }
    reverseIdx() {
        this.currentPlayerIndex = this.players.size - this.currentPlayerIndex - 1;
    }
    reset() {
        this.roundInProgress = true;
        this.bsCalled = false;
        this._currentCall = null;
        this.callsOpen = true;
        this.clowned = 0;
        this.last3CallsTracker = [true, true, true];
    }
    nextRound() {
        this._round += 1;
    }
    formatCurrentCall() {
        return formatCall(this.currentCall?.call);
    }
    addToTracker(val) {
        this.last3CallsTracker.shift();
        this.last3CallsTracker.push(val);
    }
    last3CallsFalse() {
        return this.last3CallsTracker.every(x => x === false);
    }
}
//# sourceMappingURL=StateManager.js.map