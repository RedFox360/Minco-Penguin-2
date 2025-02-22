export var HandRank;
(function (HandRank) {
    HandRank[HandRank["High"] = 0] = "High";
    HandRank[HandRank["Pair"] = 1] = "Pair";
    HandRank[HandRank["DoublePair"] = 2] = "DoublePair";
    HandRank[HandRank["TriplePair"] = 3] = "TriplePair";
    HandRank[HandRank["Triple"] = 4] = "Triple";
    HandRank[HandRank["Straight"] = 5] = "Straight";
    HandRank[HandRank["Flush"] = 6] = "Flush";
    HandRank[HandRank["FlushMax"] = 9] = "FlushMax";
    HandRank[HandRank["DoubleFlush"] = 10] = "DoubleFlush";
    HandRank[HandRank["FullHouse"] = 11] = "FullHouse";
    HandRank[HandRank["DoubleTriple"] = 12] = "DoubleTriple";
    HandRank[HandRank["Quad"] = 13] = "Quad";
    HandRank[HandRank["StraightFlush"] = 14] = "StraightFlush";
    HandRank[HandRank["StraightFlushMax"] = 17] = "StraightFlushMax";
})(HandRank || (HandRank = {}));
// rank to name index
export const RNI = {
    [HandRank.High]: 0,
    [HandRank.Pair]: 1,
    [HandRank.Triple]: 2,
    [HandRank.Straight]: 3,
    [HandRank.Flush]: 4, // Hearts
    [HandRank.Flush + 1]: 5, // Diamonds
    [HandRank.Flush + 2]: 6, // Clubs
    [HandRank.FlushMax]: 7, // Spades
    [HandRank.Quad]: 8,
    [HandRank.StraightFlush]: 9, // Hearts
    [HandRank.StraightFlush + 1]: 10, // Diamonds
    [HandRank.StraightFlush + 2]: 11, // Clubs
    [HandRank.StraightFlushMax]: 12, // Spades
};
export const RNIKeys = Object.keys(RNI).map(n => parseInt(n));
export const names = [
    ["high", "h", "haut"],
    ["pair", "double", "p", "d", "paire", "drunk"],
    ["triple", "t", "brelan", "hungover"],
    ["high straight", "straight", "s", "suite"],
    [
        "flush hearts",
        "hearts flush",
        "high hearts flush",
        "high flush hearts",
        "fh",
        "hf",
        "couleur cœur",
    ],
    [
        "flush diamonds",
        "diamonds flush",
        "high diamonds flush",
        "high flush diamonds",
        "fd",
        "df",
        "couleur carreau",
    ],
    [
        "flush clubs",
        "clubs flush",
        "high clubs flush",
        "high flush clubs",
        "fc",
        "cf",
        "couleur trèfle",
    ],
    [
        "flush spades",
        "spades flush",
        "high spades flush",
        "high flush spades",
        "fs",
        "sf",
        "couleur pique",
    ],
    ["quad", "q", "quadruple", "carré", "overdose"],
    [
        "straight flush hearts",
        "hearts straight flush",
        "high hearts straight flush",
        "high straight flush hearts",
        "sfh",
        "hsf",
        "quinte flush cœur",
    ],
    [
        "straight flush diamonds",
        "diamonds straight flush",
        "high diamonds straight flush",
        "high straight flush diamonds",
        "sfd",
        "dsf",
        "quinte flush carreau",
    ],
    [
        "straight flush clubs",
        "clubs straight flush",
        "high clubs straight flush",
        "high straight flush clubs",
        "sfc",
        "csf",
        "quinte flush trèfle",
    ],
    [
        "straight flush spades",
        "spades straight flush",
        "high spades straight flush",
        "high straight flush spades",
        "sfs",
        "ssf",
        "quinte flush pique",
    ],
];
export const royalFlushes = [
    [
        "hearts royal flush",
        "royal flush hearts",
        "royal hearts flush",
        "rfh",
        "rhf",
        "hrf",
        "quinte flush royale de cœur",
    ],
    [
        "diamonds royal flush",
        "royal flush diamonds",
        "royal diamonds flush",
        "rfd",
        "rdf",
        "drf",
        "quinte flush royale de carreau",
    ],
    [
        "clubs royal flush",
        "royal flush clubs",
        "royal clubs flush",
        "rfc",
        "rcf",
        "crf",
        "quinte flush royale de trèfle",
    ],
    [
        "spades royal flush",
        "royal flush spades",
        "royal spades flush",
        "rfs",
        "rsf",
        "srf",
        "quinte flush royale de pique",
    ],
];
export var ClownState;
(function (ClownState) {
    ClownState[ClownState["NotClowned"] = 0] = "NotClowned";
    ClownState[ClownState["Clowned"] = 1] = "Clowned";
    ClownState[ClownState["ClownedAndCalled"] = 2] = "ClownedAndCalled";
})(ClownState || (ClownState = {}));
export const customIds = {
    joinMidGame: "join_mid_game_bspoker",
    leaveMidGame: "leave_mid_game_bspoker",
    viewCards: "view_cards_bspoker",
    viewGameInfo: "view_game_info_bspoker",
    bs: "bs_bspoker",
    clown: "clown_bspoker",
};
export const customIdValues = Object.values(customIds);
//# sourceMappingURL=bs_poker_types.js.map