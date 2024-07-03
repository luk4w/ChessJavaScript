import { getRookMoves } from './rook.js';
import { getBishopMoves } from './bishop.js';
/** 
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt}
*/
function getQueenMoves(from, color, bitboards) {
    return getRookMoves(from, color, bitboards) | getBishopMoves(from, color, bitboards);
}
export { getQueenMoves };