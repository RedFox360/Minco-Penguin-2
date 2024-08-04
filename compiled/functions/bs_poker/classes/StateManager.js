import { ClownState } from "../bs_poker_types.js";
import { formatCall } from "../bs_poker_functions.js";
export default class StateManager {
    constructor() {
        this.roundInProgress = false;
        this.callsOpen = true;
        this.bsCalled = false;
        this.aborted = false;
        this.bxOpen = false;
        this.clowned = ClownState.NotClowned;
        this.currentCall = null;
        this.last3CallsTracker = [true, true, true];
        this._round = 0;
    }
    get round() {
        return this._round;
    }
    reset() {
        this.roundInProgress = true;
        this.bsCalled = false;
        this.currentCall = null;
        this.callsOpen = true;
        this.clowned = ClownState.NotClowned;
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