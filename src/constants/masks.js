export const H_FILE = 0x0101010101010101n;
export const G_FILE = H_FILE << 1n;
export const F_FILE = H_FILE << 2n;
export const E_FILE = H_FILE << 3n;
export const D_FILE = H_FILE << 4n;
export const C_FILE = H_FILE << 5n;
export const B_FILE = H_FILE << 6n;
export const A_FILE = H_FILE << 7n;

export const RANK_1 = 0xFFn;
export const RANK_2 = RANK_1 << 8n;
export const RANK_3 = RANK_1 << 16n;
export const RANK_4 = RANK_1 << 24n;
export const RANK_5 = RANK_1 << 32n;
export const RANK_6 = RANK_1 << 40n;
export const RANK_7 = RANK_1 << 48n;
export const RANK_8 = RANK_1 << 56n;

export const FILES_MASK = {"a":A_FILE, "b":B_FILE, "c":C_FILE, "d":D_FILE, "e":E_FILE, "f":F_FILE, "g":G_FILE, "h":H_FILE};
export const RANKS_MASK = {"1":RANK_1, "2":RANK_2, "3":RANK_3, "4":RANK_4, "5":RANK_5, "6":RANK_6, "7":RANK_7, "8":RANK_8};