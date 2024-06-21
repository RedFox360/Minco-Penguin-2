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
    ["high", "high card", "h"],
    ["pair", "double", "p", "d"],
    ["triple", "t"],
    ["high straight", "straight", "s"],
    [
        "high flush:hearts:",
        "flush:hearts:",
        "flush hearts",
        "hearts flush",
        "high hearts flush",
        "high flush hearts",
        "fh",
        "hf",
    ],
    [
        "high flush:diamonds:",
        "flush:diamonds:",
        "flush diamonds",
        "diamonds flush",
        "high diamonds flush",
        "high flush diamonds",
        "fd",
        "df",
    ],
    [
        "high flush<:clubst:1241960807005425768>",
        "flush<:clubst:1241960807005425768>",
        "flush clubs",
        "clubs flush",
        "high clubs flush",
        "high flush clubs",
        "fc",
        "cf",
    ],
    [
        "high flush<:spadest:1241960808305659975>",
        "flush<:spadest:1241960808305659975>",
        "flush spades",
        "spades flush",
        "high spades flush",
        "high flush spades",
        "fs",
        "sf",
    ],
    ["quad", "q"],
    [
        "high straight flush:hearts:",
        "straight flush:hearts:",
        "straight flush hearts",
        "hearts straight flush",
        "high hearts straight flush",
        "high straight flush hearts",
        "sfh",
        "hsf",
    ],
    [
        "high straight flush:diamonds:",
        "straight flush:diamonds:",
        "straight flush diamonds",
        "diamonds straight flush",
        "high diamonds straight flush",
        "high straight flush diamonds",
        "sfd",
        "dsf",
    ],
    [
        "high straight flush<:clubst:1241960807005425768>",
        "straight flush<:clubst:1241960807005425768>",
        "straight flush clubs",
        "clubs straight flush",
        "high clubs straight flush",
        "high straight flush clubs",
        "sfc",
        "csf",
    ],
    [
        "high straight flush<:spadest:1241960808305659975>",
        "straight flush<:spadest:1241960808305659975>",
        "straight flush spades",
        "spades straight flush",
        "high spades straight flush",
        "high straight flush spades",
        "sfs",
        "ssf",
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
    ],
    [
        "diamonds royal flush",
        "royal flush diamonds",
        "royal diamonds flush",
        "rfd",
        "rdf",
        "drf",
    ],
    [
        "clubs royal flush",
        "royal flush clubs",
        "royal clubs flush",
        "rfc",
        "rcf",
        "crf",
    ],
    [
        "spades royal flush",
        "royal flush spades",
        "royal spades flush",
        "rfs",
        "rsf",
        "srf",
    ],
];
//# sourceMappingURL=bs_poker_types.js.map