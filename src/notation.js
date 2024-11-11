// Importação das constantes
import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, PIECES_SAN } from './constants/pieces.js';
import { WHITE, BLACK } from './constants/colors.js';

class Notation {

    /**
        @FEN (Forsyth-Edwards Notation)
        Notação usada para descrever o estado de um tabuleiro de xadrez.

        @EXEMPLO_ESTADO_INICIAL
        rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1

        @POSICOES_DO_TABULEIRO
        Os campos separados por / representam as fileiras do tabuleiro, cada letra representa uma peça:
        r - black rook ; n - black knight ; b - black bishop ; q - black queen ; k - black king ; p - black pawn
        R - white rook ; N - white knight ; B - white bishop ; Q - white queen ; K - white king ; P - white pawn
        Os números representam as casas vazias.

        RNBQKBNR
        PPPPPPPP
        8
        8
        8
        8
        pppppppp
        rnbqkbnr

        @TURNO_ATUAL
        w = white; b = black.

        @ROQUE
        K - white kingside castling ; Q - white queenside castling
        k - black kingside castling ; q - black queenside castling
        - - sem possibilidade de roque

        @CAPTURA_EN_PASSANT
        Caso exista a possibilidade de captura en passant, a posição do peão adversário é informada.

        @MEIO_MOVIMENTO
        O número de meios movimentos desde a última captura ou movimento de peão.

        @NUMERO_DE_JOGADAS
        O número de jogadas completas (brancas jogam e pretas jogam).
    */
    static generateFEN(board) {
        const PIECES = ["p", "n", "b", "r", "q", "k"];
        let fen = "";
        let emptyCount = 0;

        // itera sobre as 8 linhas do tabuleiro
        for (let x = 7; x >= 0; x--) {
            // itera sobre as 8 colunas do tabuleiro
            for (let y = 7; y >= 0; y--) {
                let index = x * 8 + y;
                let piece = null;
                for (let i = 0; i < 6; i++) {
                    // Verifica se existem peças (brancas ou pretas) na posição indicada
                    if (board.bitboards[WHITE][i] & (1n << BigInt(index))) {
                        // Converte a peça para a notação FEN
                        piece = PIECES[i].toUpperCase();
                        break;
                    } else if (board.bitboards[BLACK][i] & (1n << BigInt(index))) {
                        // Converte a peça para a notação FEN
                        piece = PIECES[i];
                        break;
                    }
                }
                // Piece !== null, significa que existe uma peça na posição
                if (piece !== null) { // if(piece) {...} também funciona
                    // Se existem casas vazias antes da peça
                    if (emptyCount > 0) {
                        fen += emptyCount; // Adiciona o número de casas vazias ao FEN
                        emptyCount = 0; // Reseta o contador de casas vazias
                    }
                    fen += piece; // Adiciona a peça ao FEN
                } else {
                    emptyCount++; // Incrementa o contador de casas vazias
                }
            }
            // Se existem casas vazias no final da linha
            if (emptyCount > 0) {
                // Adiciona o número de casas vazias ao FEN
                fen += emptyCount;
                emptyCount = 0; // Reseta o contador de casas vazias
            }
            // Se não for a última linha
            if (x > 0) {
                // Adiciona a barra para separar as linhas
                fen += '/';
            }
        }

        // Adiciona o turno atual a FEN
        fen += board.turn === WHITE ? " w " : " b ";

        // Obtem as possibilidades de roque
        fen += board.getCastlingFEN(board.availableCastlingMask);

        // Verifica se existe a possibilidade de captura en passant
        if (board.enPassant !== null) {
            // converte a posição en passant para a notação FEN
            const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"];
            let y = LETTERS[7 - (board.enPassant % 8)];
            let x = 1 + Math.trunc(board.enPassant / 8);
            // Adiciona a posição de captura do en passant ao FEN
            x += board.turn === WHITE ? 1 : -1;
            fen += " " + y + x + " ";
        } else {
            fen += " - ";
        }

        // Contador de meios movimentos
        fen += board.halfMoves + " ";
        // Adiciona o número de jogadas completas
        fen += board.fullMoves;

        return fen;
    }

    // Portable Game Notation
    static generatePGN(board) {
        let pgn = "";
        // Metadados da partida
        pgn += `[Event "${board.metadata.event}"]\n`;
        pgn += `[Site "${board.metadata.site}"]\n`;
        pgn += `[Date "${board.metadata.date}"]\n`;
        pgn += `[Round "${board.metadata.round}"]\n`;
        pgn += `[White "${board.metadata.white}"]\n`;
        pgn += `[Black "${board.metadata.black}"]\n`;
        pgn += `[Result "${board.metadata.result}"]\n\n`;
        // Movimentos da partida
        for (let i = 0; i < board.metadata.moves.length; i++) {
            if (i % 2 === 0) {
                pgn += `${Math.floor(i / 2) + 1}. `;
            }
            pgn += `${board.metadata.moves[i]} `;
        }
        return pgn;
    }

    static getSanMove(from, to, pieceType, isCapture, promotionPiece, isCheck, isCheckmate) {
        const FILES = "hgfedcba";
        const RANKS = "12345678";
        const FROM_FILE = FILES[from % 8];
        const FROM_RANK = RANKS[Math.floor(from / 8)];
        const TO_FILE = FILES[to % 8];
        const TO_RANK = RANKS[Math.floor(to / 8)];
        const PIECE = PIECES_SAN[pieceType];
        const CAPTURE = isCapture ? 'x' : '';
        const PROMOTION = promotionPiece ? `=${PIECES_SAN[promotionPiece]}` : '';
        let check = isCheck ? "+" : "";
        const CHECKMATE = isCheckmate ? '#' : '';
        if (isCheckmate) check = '';
        if (pieceType === KING && Math.abs(from - to) === 2) {
            if (to % 8 === 1) {
                return `O-O${check}${CHECKMATE}`;
            } else if (to % 8 === 5) {
                return `O-O-O${check}${CHECKMATE}`;
            }
        }
        return `${PIECE}${FROM_FILE}${FROM_RANK}${CAPTURE}${TO_FILE}${TO_RANK}${PROMOTION}${check}${CHECKMATE}`;
    }

    // Obter o indíce do bitboard a partir da movimento em notação algébrica
    static getIndexFromMove(move) {
        const file = move.charCodeAt(0) - 'a'.charCodeAt(0);
        const rank = 8 - parseInt(move[1], 10);
        return rank * 8 + file;
    }

    // Obter a peça do movimento da notação FEN
    static getPieceFromFEN(fen, move) {
        const [position] = fen.split(' ');
        const rows = position.split('/');
        const index = this.getIndexFromMove(move);
        let piece = null;
        let currentIndex = 0;
        for (const row of rows) {
            for (const char of row) {
                if (/\d/.test(char)) {
                    currentIndex += parseInt(char, 10);
                } else {
                    if (currentIndex === index) {
                        switch (char) {
                            case 'p':
                            case 'P':
                                piece = PAWN;
                                break;
                            case 'n':
                            case 'N':
                                piece = KNIGHT;
                                break;
                            case 'b':
                            case 'B':
                                piece = BISHOP;
                                break;
                            case 'r':
                            case 'R':
                                piece = ROOK;
                                break;
                            case 'q':
                            case 'Q':
                                piece = QUEEN;
                                break;
                            case 'k':
                            case 'K':
                                piece = KING;
                                break;
                            default:
                                throw new Error('Invalid Piece');
                        }
                        break;
                    }
                    currentIndex++;
                }
            }
            if (piece !== null) break;
        }
        return piece;
    }
}
export default Notation;