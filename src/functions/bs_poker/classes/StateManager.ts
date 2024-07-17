import { type Snowflake } from "discord.js";
import {
	Call,
	ClownState,
	type PlayerCall,
	type ReadonlyPlayerCollection,
} from "../bs_poker_types.js";
import type Player from "./Player.js";
import { formatCall } from "../bs_poker_functions.js";

export default class StateManager {
	public roundInProgress = false;
	public callsOpen = true;
	public bsCalled = false;
	public aborted = false;
	public bxOpen = false;
	public clowned: ClownState;
	private last3CallsTracker: [boolean, boolean, boolean] = [true, true, true];
	private _currentCall: PlayerCall | null = null;
	private _round = 0;
	private _currPlayerIdx = 0;

	constructor(private readonly players: ReadonlyPlayerCollection) {}

	public get currentCall() {
		return this._currentCall;
	}

	public get round() {
		return this._round;
	}

	public setCurrentCall(call: Call) {
		this._currentCall = {
			call,
			player: this.currentPlayer,
		};
	}

	private get currentPlayerIndex(): number {
		if (this._currPlayerIdx < 0 || this._currPlayerIdx >= this.players.size) {
			return 0;
		} else {
			return this._currPlayerIdx;
		}
	}

	private set currentPlayerIndex(newIdx: number) {
		if (newIdx < 0 || newIdx >= this.players.size) {
			this._currPlayerIdx = 0;
		} else {
			this._currPlayerIdx = newIdx;
		}
	}

	public get currentPlayer(): Player {
		return this.players.at(this.currentPlayerIndex);
	}

	public forward() {
		this.currentPlayerIndex += 1;
	}

	public setIdxToIdxOf(playerId: Snowflake) {
		this.currentPlayerIndex = Array.from(this.players.keys()).indexOf(playerId);
	}

	public reverseIdx() {
		this.currentPlayerIndex = this.players.size - this.currentPlayerIndex - 1;
	}

	public reset() {
		this.roundInProgress = true;
		this.bsCalled = false;
		this._currentCall = null;
		this.callsOpen = true;
		this.clowned = 0;
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
