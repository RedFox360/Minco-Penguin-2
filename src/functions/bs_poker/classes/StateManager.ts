import { ClownState, type PlayerCall } from "../bs_poker_types.js";
import { formatCall } from "../bs_poker_functions.js";

export default class StateManager {
	public roundInProgress = false;
	public callsOpen = true;
	public bsCalled = false;
	public aborted = false;
	public bxOpen = false;
	public clowned: ClownState = ClownState.NotClowned;
	public currentCall: PlayerCall | null = null;
	private last3CallsTracker: boolean[] = [true, true, true];
	private _round = 0;

	public get round() {
		return this._round;
	}

	public reset() {
		this.roundInProgress = true;
		this.bsCalled = false;
		this.currentCall = null;
		this.callsOpen = true;
		this.clowned = ClownState.NotClowned;
		this.last3CallsTracker = [true, true, true];
	}

	public nextRound() {
		this._round += 1;
	}

	public formatCurrentCall() {
		return formatCall(this.currentCall?.call);
	}

	public addToTracker(val: boolean) {
		this.last3CallsTracker.shift();
		this.last3CallsTracker.push(val);
	}

	public last3CallsFalse() {
		return this.last3CallsTracker.every(x => x === false);
	}
}
