import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING } from '../constants/pieces.js';
import { WHITE, BLACK } from '../constants/colors.js';
/** Obtem os movimentos do peão
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @param {Integer} enPassant
 * @returns {BigInt}
*/
function getPawnMoves(from, color, bitboards, enPassant) {
    let bitboardMoves = 0n;
    // Variáveis comuns
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    const ADVANCE = color === WHITE ? 8n : -8n;
    const DOUBLE_ADVANCE = color === WHITE ? 16n : -16n;
    const START_ROW = color === WHITE ? 0x000000000000FF00n : 0x00FF000000000000n;

    // Movimento de avanço simples
    let movement = 1n << (BigInt(from) + ADVANCE);
    // Verifica se a casa está vazia
    if (!(OPPONENT_PIECES & movement || (OWN_PIECES & movement))) {
        bitboardMoves |= movement;
    }
    // Movimento de avanço duplo
    movement = 1n << (BigInt(from) + DOUBLE_ADVANCE);
    // Verifica se o peão está na linha inicial e se a casa intermediaria e final estão vazias
    if (START_ROW & (1n << BigInt(from))) {
        // Calcula a casa intermediaria
        let middleSquare = 1n << (BigInt(from) + ADVANCE);
        // Verifica se a casa intermediaria e final estão vazias
        if (!(OPPONENT_PIECES & middleSquare || OWN_PIECES & middleSquare) && !(OPPONENT_PIECES & movement || OWN_PIECES & movement)) {
            bitboardMoves |= movement;
        }
    }
    // Movimentos de captura
    bitboardMoves |= getCaptureLeft(from, color, bitboards);
    bitboardMoves |= getCaptureRight(from, color, bitboards);
    // Movimento de captura en passant
    if (enPassant !== null) {
        // Posicoes laterais
        let p1 = color === WHITE ? from + 1 : from - 1;
        let p2 = color === WHITE ? from - 1 : from + 1;
        // se a posição lateral s1 for igual a do peão marcado para captura en passant
        if (p1 === enPassant) {
            bitboardMoves |= getCaptureLeft(from, color, bitboards);
        }
        // se a posição lateral s2 for igual a do peão marcado para captura en passant
        else if (p2 === enPassant) {
            bitboardMoves |= getCaptureRight(from, color, bitboards);
        }
    }
    return bitboardMoves;
}
/** Captura para a esquerda
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getCaptureLeft(from, color, bitboards) {
    let captureLeft = color === WHITE ? ((1n << BigInt(from)) << 9n) : ((1n << BigInt(from)) >> 9n);
    // Variáveis comuns
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    // Verifica a captura para a esquerda
    if (captureLeft & OPPONENT_PIECES) {
        return captureLeft;
    }
    return 0n;
}
/** Captura para a direita
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getCaptureRight(from, color, bitboards) {
    let captureRight = color === WHITE ? ((1n << BigInt(from)) << 7n) : ((1n << BigInt(from)) >> 7n);
    // Variáveis comuns
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;
    // Verifica a captura para a esquerda
    if (captureRight & OPPONENT_PIECES) {
        return captureRight;
    }
    return 0n;
}
export { getPawnMoves, getCaptureLeft, getCaptureRight };