import { Snowflake } from "discord.js";
import {
	ClownState,
	ExtCard,
	PlayerCall,
	ReadonlyPlayerCollection,
} from "../bs_poker_types.js";
import Player from "./Player.js";
import { callInDeck, formatCall } from "../bs_poker_functions.js";

export default class StateManager {
	public roundInProgress = false;
	public lastThreeCallTracker: [boolean, boolean, boolean] = [true, true, true];
	public callsOpen = true;
	public bsCalled = false;
	public aborted = false;
	public bxOpen = false;
	public clowned: ClownState;
	public currentCall: PlayerCall | null = null;
	private _round = 0;
	private _currPlayerIdx = 0;

	constructor(
		private readonly players: ReadonlyPlayerCollection,
		private readonly commonCards: ExtCard[]
	) {}

	public get round() {
		return this._round;
	}

	public get currentPlayerIndex(): number {
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

	public get currentDeck(): ExtCard[] {
		const deck = this.players.hands.flat(1);
		deck.push(...this.commonCards);
		return deck;
	}

	public reset() {
		this.roundInProgress = true;
		this.bsCalled = false;
		this.currentCall = null;
		this.callsOpen = true;
		this.clowned = 0;
		this.lastThreeCallTracker = [true, true, true];
	}

	public nextRound() {
		this._round += 1;
	}

	public formatCurrentCall() {
		return formatCall(this.currentCall?.call);
	}

	public addToTracker(val: boolean) {
		this.lastThreeCallTracker.shift();
		this.lastThreeCallTracker.push(val);
	}
}
