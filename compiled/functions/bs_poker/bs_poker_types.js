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
    ["high", "h", "haut", "set"],
    ["pair", "double", "p", "d", "paire", "light"],
    ["triple", "t", "brelan", "boom"],
    ["high straight", "straight", "s", "suite", "countdown"],
    [
        "flush hearts",
        "hearts flush",
        "high hearts flush",
        "high flush hearts",
        "fh",
        "hf",
        "couleur cœur",
        "lightning fuse",
    ],
    [
        "flush diamonds",
        "diamonds flush",
        "high diamonds flush",
        "high flush diamonds",
        "fd",
        "df",
        "couleur carreau",
        "fire fuse",
    ],
    [
        "flush clubs",
        "clubs flush",
        "high clubs flush",
        "high flush clubs",
        "fc",
        "cf",
        "couleur trèfle",
        "plasma fuse",
    ],
    [
        "flush spades",
        "spades flush",
        "high spades flush",
        "high flush spades",
        "fs",
        "sf",
        "couleur pique",
        "magma fuse",
    ],
    ["quad", "q", "carré", "nuke"],
    [
        "straight flush hearts",
        "hearts straight flush",
        "high hearts straight flush",
        "high straight flush hearts",
        "sfh",
        "hsf",
        "quinte flush cœur",
        "lightning bombshell",
    ],
    [
        "straight flush diamonds",
        "diamonds straight flush",
        "high diamonds straight flush",
        "high straight flush diamonds",
        "sfd",
        "dsf",
        "quinte flush carreau",
        "fire bombshell",
    ],
    [
        "straight flush clubs",
        "clubs straight flush",
        "high clubs straight flush",
        "high straight flush clubs",
        "sfc",
        "csf",
        "quinte flush trèfle",
        "plasma bombshell",
    ],
    [
        "straight flush spades",
        "spades straight flush",
        "high spades straight flush",
        "high straight flush spades",
        "sfs",
        "ssf",
        "quinte flush pique",
        "magma bombshell",
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
        "atomic lightning bombshell",
    ],
    [
        "diamonds royal flush",
        "royal flush diamonds",
        "royal diamonds flush",
        "rfd",
        "rdf",
        "drf",
        "quinte flush royale de carreau",
        "atomic fire bombshell",
    ],
    [
        "clubs royal flush",
        "royal flush clubs",
        "royal clubs flush",
        "rfc",
        "rcf",
        "crf",
        "quinte flush royale de trèfle",
        "atomic plasma bombshell",
    ],
    [
        "spades royal flush",
        "royal flush spades",
        "royal spades flush",
        "rfs",
        "rsf",
        "srf",
        "quinte flush royale de pique",
        "atomic magma bombshell",
    ],
];
//# sourceMappingURL=bs_poker_types.js.map