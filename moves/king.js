import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING } from '../constants/pieces.js';
import { WHITE, BLACK } from '../constants/colors.js';
/** 
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getKingMoves(from, color, bitboards) {

    let bitboardMoves = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK] | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK] | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const kingMoves = [1, -1, 8, -8, 7, -7, 9, -9];
    for (let move of kingMoves) {
        // Calcula a posição do movimento
        let movement = from + move;
        // Verificação de borda para evitar saidas do tabuleiro
        if (movement >= 0 && movement < 64) {
            if (Math.abs((from % 8) - (movement % 8)) <= 1) {
                if (!(OWN_PIECES & (1n << BigInt(movement)))) {
                    bitboardMoves |= 1n << BigInt(movement);
                }
            }
        }
    }
    // Movimento de roque
    // ...
    return bitboardMoves;
}
export { getKingMoves };