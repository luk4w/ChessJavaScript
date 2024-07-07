import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING } from '../constants/pieces.js';
import { WHITE, BLACK } from '../constants/colors.js';
import { NOT_A_FILE, NOT_H_FILE, NOT_8_RANK, NOT_1_RANK } from '../constants/edges.js';
/** 
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getBishopMoves(from, color, bitboards) {
    return getUR(from, color, bitboards) | getUL(from, color, bitboards) | getLL(from, color, bitboards)
        | getLR(from, color, bitboards);
}

/** 
 * Obtem os movimentos possíveis para a diagonal superior direita (Upper Right)
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt} Diagonal ↗
*/
function getUR(from, color, bitboards) {
    let ur = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    // Movimentos para a diagonal superior direita do bitboard
    let movement = 1n << BigInt(from);
    while (movement & (NOT_H_FILE & NOT_8_RANK)) {
        movement <<= 7n; // deslocamento para diagonal superior direita 
        if (movement & OWN_PIECES) break;
        ur |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    return ur;
}

/**
 * Obtem os movimentos possíveis para a diagonal superior esquerda (Upper Left)
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt} Diagonal ↖
*/
function getUL(from, color, bitboards) {
    let ul = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    // Movimentos para a diagonal superior esquerda do bitboard
    let movement = 1n << BigInt(from);
    while (movement & (NOT_A_FILE & NOT_8_RANK)) {
        movement <<= 9n; // deslocamento para diagonal superior esquerda
        if (movement & OWN_PIECES) break;
        ul |= movement; // adiciona o movimento ao bitboard
        // Se encontrar uma peça adversária, para a execução
        if (movement & OPPONENT_PIECES) break;
    }
    return ul;
}

/**
 * Obtem os movimentos possíveis para a diagonal inferior esquerda (Lower Left)
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt} Diagonal ↙
*/
function getLL(from, color, bitboards) {
    let ll = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    let movement = 1n << BigInt(from);
    while (movement & (NOT_A_FILE & NOT_1_RANK)) {
        movement >>= 7n; // deslocamento para diagonal inferior esquerda
        if (movement & OWN_PIECES) break;
        ll |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    return ll;
}

/**
 * Obtem os movimentos possíveis para a diagonal inferior direita (Lower Right)
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt} Diagonal ↘
*/
function getLR(from, color, bitboards) {
    let lr = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    // Movimentos para a diagonal inferior direita do bitboard
    let movement = 1n << BigInt(from);
    while (movement & (NOT_H_FILE & NOT_1_RANK)) {
        movement >>= 9n; // deslocamento para diagonal inferior direita
        if (movement & OWN_PIECES) break;
        lr |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    return lr;
}
export { getBishopMoves, getUR, getUL, getLL, getLR };