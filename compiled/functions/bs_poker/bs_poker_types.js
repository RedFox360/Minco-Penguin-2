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
    ["high", "h", "haut", "‌"], // 1 U+200C character
    ["pair", "double", "p", "d", "paire", "drunk", "‌‌"], // 2 U+200C characters
    ["triple", "t", "brelan", "hungover", "‌‌‌"], // 3 U+200C characters
    ["high straight", "straight", "s", "suite", "‌‌‌‌"], // 4 U+200C characters
    [
        "flush hearts",
        "hearts flush",
        "high hearts flush",
        "high flush hearts",
        "fh",
        "hf",
        "couleur cœur",
        "‌‌‌‌‌", // 5 U+200C characters
    ],
    [
        "flush diamonds",
        "diamonds flush",
        "high diamonds flush",
        "high flush diamonds",
        "fd",
        "df",
        "couleur carreau",
        "‌‌‌‌‌‌", // 6 U+200C characters
    ],
    [
        "flush clubs",
        "clubs flush",
        "high clubs flush",
        "high flush clubs",
        "fc",
        "cf",
        "couleur trèfle",
        "‌‌‌‌‌‌‌", // 7 U+200C characters
    ],
    [
        "flush spades",
        "spades flush",
        "high spades flush",
        "high flush spades",
        "fs",
        "sf",
        "couleur pique",
        "‍‍‍‍‍‍‍‍‌‌‌‌‌‌‌‌", // 8 U+200C characters
    ],
    ["quad", "q", "quadruple", "carré", "overdose", "‌‌‌‌‌‌‌‌‌"], // 9 U+200C characters
    [
        "straight flush hearts",
        "hearts straight flush",
        "high hearts straight flush",
        "high straight flush hearts",
        "sfh",
        "hsf",
        "quinte flush cœur",
        "‌‌‌‌‌‌", // 10 U+200C characters
    ],
    [
        "straight flush diamonds",
        "diamonds straight flush",
        "high diamonds straight flush",
        "high straight flush diamonds",
        "sfd",
        "dsf",
        "quinte flush carreau",
        "‌‌‌‌‌‌‌‌‌‌‌", // 11 U+200C characters
    ],
    [
        "straight flush clubs",
        "clubs straight flush",
        "high clubs straight flush",
        "high straight flush clubs",
        "sfc",
        "csf",
        "quinte flush trèfle",
        "‌‌‌‌‌‌‌‌‌‌‌‌", // 12 U+200C characters
    ],
    [
        "straight flush spades",
        "spades straight flush",
        "high spades straight flush",
        "high straight flush spades",
        "sfs",
        "ssf",
        "quinte flush pique",
        "‌‌‌‌‌‌‌‌‌‌‌‌‌", // 13 U+200C characters
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
        "‌‌‌‌‌‌‌‌‌‌‌‌‌‌", // 14 U+200C characters
    ],
    [
        "diamonds royal flush",
        "royal flush diamonds",
        "royal diamonds flush",
        "rfd",
        "rdf",
        "drf",
        "quinte flush royale de carreau",
        "‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌", // 15 U+200C characters
    ],
    [
        "clubs royal flush",
        "royal flush clubs",
        "royal clubs flush",
        "rfc",
        "rcf",
        "crf",
        "quinte flush royale de trèfle",
        "‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌", // 16 U+200C characters
    ],
    [
        "spades royal flush",
        "royal flush spades",
        "royal spades flush",
        "rfs",
        "rsf",
        "srf",
        "quinte flush royale de pique",
        "‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌", // 17 U+200C characters
    ],
];
export const symbolToValueObj = {
    joker: 1,
    x: 1,
    spark: 1,
    "‌": 1, // 1 U+200C character
    two: 2,
    deuce: 2,
    deux: 2,
    "‌‌": 2, // 2 U+200C characters
    three: 3,
    trois: 3,
    "‌‌‌": 3, // 3 U+200C characters
    four: 4,
    quatre: 4,
    "‌‌‌‌": 4, // 4 U+200C characters
    five: 5,
    cinq: 5,
    "‌‌‌‌‌": 5, // 5 U+200C characters
    six: 6,
    "‌‌‌‌‌‌": 6, // 6 U+200C characters
    seven: 7,
    sept: 7,
    "‌‌‌‌‌‌‌": 7, // 7 U+200C characters
    eight: 8,
    huit: 8,
    "‌‌‌‌‌‌‌‌": 8, // 8 U+200C characters
    nine: 9,
    neuf: 9,
    "‌‌‌‌‌‌‌‌‌": 9, // 9 U+200C characters
    ten: 10,
    t: 10,
    dix: 10,
    "‌‌‌‌‌‌‌‌‌‌": 10, // 10 U+200C characters
    jack: 11,
    j: 11,
    knave: 11,
    valet: 11,
    grenade: 11,
    "‌‌‌‌‌‌‌‌‌‌‌": 11, // 11 U+200C characters
    queen: 12,
    q: 12,
    dame: 12,
    tnt: 12,
    "‌‌‌‌‌‌‌‌‌‌‌‌": 12, // 12 U+200C characters
    king: 13,
    k: 13,
    roi: 13,
    dynamite: 13,
    "‌‌‌‌‌‌‌‌‌‌‌‌‌": 13, // 13 U+200C characters
    ace: 14,
    a: 14,
    as: 14,
    "‌‌‌‌‌‌‌‌‌‌‌‌‌‌": 14, // 14 U+200C characters
    insurance: 15,
    i: 15,
    assurance: 15,
    flashbang: 15,
    "‌‌‌‌‌‌‌‌‌‌‌‌‌‌‌": 15, // 15 U+200C characters
};
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