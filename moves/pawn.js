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
    const CAPTURE_RIGHT = color === WHITE ? ((1n << BigInt(from)) << 7n) : ((1n << BigInt(from)) >> 9n);
    const CAPTURE_LEFT = color === WHITE ? ((1n << BigInt(from)) << 9n) : ((1n << BigInt(from)) >> 7n);
    // Verifica a captura para a direita
    if (CAPTURE_RIGHT & OPPONENT_PIECES) {
        bitboardMoves |= CAPTURE_RIGHT;
    }
    // Verifica a captura para a esquerda
    if (CAPTURE_LEFT & OPPONENT_PIECES) {
        bitboardMoves |= CAPTURE_LEFT;
    }
    // Movimento de captura en passant
    if (enPassant !== null) {
        // Posicoes laterais
        const LEFT = color === WHITE ? from + 1 : from - 1;
        const RIGHT = color === WHITE ? from - 1 : from + 1;
        // se a posição lateral a esquerda for igual a do peão marcado para captura en passant
        if (LEFT === enPassant) {
            bitboardMoves |= CAPTURE_LEFT;
        }
        // se a posição lateral a direita for igual a do peão marcado para captura en passant
        else if (RIGHT === enPassant) {
            bitboardMoves |= CAPTURE_RIGHT;
        }
    }
    return bitboardMoves;
}
export { getPawnMoves };