import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING } from '../constants/pieces.js';
import { WHITE, BLACK } from '../constants/colors.js';
import { NOT_A_FILE, NOT_H_FILE, NOT_8_RANK, NOT_1_RANK } from '../constants/edges.js';
/** 
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getRookMoves(from, color, bitboards) {

    let bitboardMoves = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK] | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK] | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;

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

    let movement;
    // Movimentos para a esquerda
    movement = 1n << BigInt(from);
    while (movement & NOT_A_FILE) {
        movement <<= 1n; // deslocamento para esquerda
        if (movement & OWN_PIECES) break; // se tiver uma peça aliada, para o movimento
        bitboardMoves |= movement; // adiciona o movimento ao bitboard
        if (movement & OPPONENT_PIECES) break; // captura e para o movimento
    }
    // Movimentos para a direita
    movement = 1n << BigInt(from);
    while (movement & NOT_H_FILE) {
        movement >>= 1n; // deslocamento para direita
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    // Movimentos para cima
    movement = 1n << BigInt(from);
    while (movement & NOT_8_RANK) {
        movement <<= 8n; // deslocamento para esquerda
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    // Movimentos para baixo
    movement = 1n << BigInt(from);
    while (movement & NOT_1_RANK) {
        movement >>= 8n; // deslocamento para direita
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    return bitboardMoves;
}
export { getRookMoves };