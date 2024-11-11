import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING } from './constants/pieces.js';
import { WHITE, BLACK } from './constants/colors.js';
import { A_FILE, H_FILE, RANK_8, RANK_1 } from './constants/masks.js';
/** 
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getRookMoves(from, color, bitboards) {
    return getL(from, color, bitboards) | getR(from, color, bitboards) | getU(from, color, bitboards)
        | getD(from, color, bitboards);
}

/**
            @EXEMPLO_DE_MOVIMENTO_TORRE

            from: 16 (h3)

            a b c d e f g h
    
            0 0 0 0 0 0 0 0   8
            0 0 0 0 0 0 0 0   7
            0 0 0 0 0 0 0 0   6   
            0 0 0 0 0 0 0 0   5
            0 0 0 0 0 0 0 0   4
            0 0 0 0 0 0 0 1   3   ---> h3
            0 0 0 0 0 0 0 0   2
            0 0 0 0 0 0 0 0   1
            
            // desloca todos os bits para a esquerda 7 vezes
            (1n << BigInt(16)) <<= 7n 

            a b c d e f g h
    
            0 0 0 0 0 0 0 0   8
            0 0 0 0 0 0 0 0   7
            0 0 0 0 0 0 0 0   6   
            0 0 0 0 0 0 0 0   5
            0 0 0 0 0 0 0 0   4
            1 0 0 0 0 0 0 0   3   ---> a3
            0 0 0 0 0 0 0 0   2
            0 0 0 0 0 0 0 0   1

            // desloca todos os bits para a direita 8 vezes
            (1n << BigInt(16)) >>= 8n

            a b c d e f g h
    
            0 0 0 0 0 0 0 0   8
            0 0 0 0 0 0 0 0   7
            0 0 0 0 0 0 0 0   6   
            0 0 0 0 0 0 0 0   5
            0 0 0 0 0 0 0 0   4
            0 0 0 0 0 0 0 0   3   
            1 0 0 0 0 0 0 0   2   ---> a2
            0 0 0 0 0 0 0 0   1
    */

/**
 * Obtem os movimentos possíveis para a esquerda (Left)
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getL(from, color, bitboards) {
    let left = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    let movement;
    // Movimentos para a esquerda
    movement = 1n << BigInt(from);
    while (movement & ~A_FILE) {
        movement <<= 1n; // deslocamento para esquerda
        if (movement & OWN_PIECES) break; // se tiver uma peça aliada, para o movimento
        left |= movement; // adiciona o movimento ao bitboard
        if (movement & OPPONENT_PIECES) break; // captura e para o movimento
    }
    return left;
}

/**
 * Obtem os movimentos possíveis para a direita (Right)
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getR(from, color, bitboards) {
    let right = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    let movement;
    // Movimentos para a direita
    movement = 1n << BigInt(from);
    while (movement & ~H_FILE) {
        movement >>= 1n; // deslocamento para direita
        if (movement & OWN_PIECES) break;
        right |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    return right;
}

/**
 * Obtem os movimentos possíveis para cima (Up)
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getU(from, color, bitboards) {
    let up = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    let movement;
    // Movimentos para cima
    movement = 1n << BigInt(from);
    while (movement & ~RANK_8) {
        movement <<= 8n; // deslocamento para esquerda
        if (movement & OWN_PIECES) break;
        up |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    return up;
}

/**
 * Obtem os movimentos possíveis para baixo (Down)
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getD(from, color, bitboards) {
    let down = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    let movement;
    // Movimentos para baixo
    movement = 1n << BigInt(from);
    while (movement & ~RANK_1) {
        movement >>= 8n; // deslocamento para direita
        if (movement & OWN_PIECES) break;
        down |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    return down;
}
export { getRookMoves, getL, getR, getU, getD };