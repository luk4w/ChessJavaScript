// Importação das constantes
import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, PIECES_STRING } from './constants/pieces.js';
import { WHITE, BLACK } from './constants/colors.js';
import Notation from "./notation.js";

class Renderer {
    game;
    constructor(game) {
        this.game = game;
        document.addEventListener('DOMContentLoaded', () => {
            const TEXAREA = document.getElementById('pgn');
            const BUTTON = document.getElementById('import-pgn-button');
            const INPUT_FEN = document.getElementById('fen');

            TEXAREA.addEventListener('focus', () => {
                BUTTON.style.visibility = "visible";
            });
            TEXAREA.addEventListener('input', () => {
                this.hideImportPGNError();
            });

            TEXAREA.addEventListener('blur', () => {
                setTimeout(() => {
                    BUTTON.style.visibility = "hidden";
                }, 200);
            });
            BUTTON.addEventListener('click', () => {
                game.importPGN(TEXAREA.value);
            });

            INPUT_FEN.addEventListener('change', () => {
                this.game.importFEN(INPUT_FEN.value, this.game.board);
                this.renderBoard(this.game.board);
            });
        });
    }

    // Função auxiliar para transformar a peça em elemento HTML
    pieceToString(piece, color) {
        return (color === WHITE ? "white_" : "black_") + PIECES_STRING[piece];
    }

    /**
        @HTML
        <table id="chessboard">
            <tr> <!-- rank 7 --> </tr>
            <tr> <!-- rank 6 --> </tr>
            <tr> <!-- rank 5 --> </tr>
            <tr> <!-- rank 4 --> </tr>
            <tr> <!-- rank 3 --> </tr>
            <tr> <!-- rank 2 --> </tr>
            <tr> <!-- rank 1 --> </tr>
            <tr> <!-- rank 0 --> </tr>
        </table>
        Função para renderizar o tabuleiro no HTML
    */
    renderBoard(board) {
        // Apenas renderiza o tabuleiro se não estiver importando um jogo
        if (this.game.isImportingGame) return;
        // Obtem o tabuleiro
        const boardElement = document.getElementById("chessboard");
        boardElement.innerHTML = ""; // Limpa tabuleiro
        // Iteração das linhas
        for (let rank = 7; rank >= 0; rank--) {
            let row = document.createElement("tr"); // table row
            // Iteração das colunas
            for (let file = 7; file >= 0; file--) {
                const index = rank * 8 + file; // index do quadrado
                let square = document.createElement("td"); // table data
                // Verifica se o rei está em xeque
                if (board.kingCheckMask === 1n << BigInt(index)) {
                    square.className = "check";
                }
                else {
                    // Adiciona a classe de acordo com a cor do quadrado
                    square.className = (rank + file) % 2 === 0 ? "white" : "black"; // alternância de cores
                }
                if (board.fromPosition === index || board.lastMoveMask & (1n << BigInt(index))) {
                    square.classList.add("selected");
                }
                // Adiciona a decoração dos movimentos possíveis
                if (board.availableMoves & (1n << BigInt(index))) {
                    const OPPONENT_COLOR = board.selectedColor === WHITE ? BLACK : WHITE;
                    const OPPONENT_PIECES = board.bitboards[OPPONENT_COLOR][PAWN] | board.bitboards[OPPONENT_COLOR][KNIGHT] | board.bitboards[OPPONENT_COLOR][BISHOP]
                        | board.bitboards[OPPONENT_COLOR][ROOK] | board.bitboards[OPPONENT_COLOR][QUEEN] | board.bitboards[OPPONENT_COLOR][KING];
                    if (OPPONENT_PIECES & (1n << BigInt(index))) {
                        square.classList.add("capture");
                    }
                    else {
                        square.classList.add("available");
                    }
                }

                square.dataset.index = index; // armazena o index do quadrado
                // adiciona o evento de clique esquerdo
                square.addEventListener("click", (event) => {
                    this.game.handleOnMoveClick(event, board);
                });

                square.addEventListener('contextmenu', this.game.handleRightClick); // adiciona o evento de clique direito
                row.appendChild(square); // adiciona a quadrado na linha
            }
            boardElement.appendChild(row); // adiciona a linha ao tabuleiro
        }
        // Atualização das peças no tabuleiro
        this.updatePiecesOnBoard(board);
    }

    // Função para atualizar todas as peças no tabuleiro
    updatePiecesOnBoard(board) {
        // Obtem o tabuleiro
        const boardElement = document.getElementById("chessboard");
        // Limpar peças existentes no tabuleiro
        boardElement.querySelectorAll(".piece").forEach(piece => piece.remove());
        // Adicionar peças atuais ao tabuleiro
        for (let color = 0; color < 2; color++) {
            // Iteração de todas as peças
            for (let piece = 0; piece < 6; piece++) {
                let bitboard = board.bitboards[color][piece]; // Obtem o bitboard da peça
                // Iteração de cada bit do bitboard
                for (let i = 0; i < 64; i++) {
                    if (bitboard & (1n << BigInt(i))) {
                        this.addPieceToBoard(i, piece, color); // Adiciona a peça ao tabuleiro
                    }
                }
            }
        }
    }

    // Função para adicionar uma peça no tabuleiro
    addPieceToBoard(index, piece, color) {
        // Obtem o tabuleiro
        const boardElement = document.getElementById("chessboard");
        // Obtem a casa do tabuleiro
        const square = boardElement.querySelector(`[data-index="${index}"]`);
        // Remove qualquer peça existente no quadrado
        square.innerHTML = "";
        // Cria o elemento para inserir a peça
        const pieceDiv = document.createElement("div");
        pieceDiv.className = `piece ${this.pieceToString(piece, color)}`;
        square.appendChild(pieceDiv); // Adiciona a peça no quadrado
    }

    updatePGN(board) {
        let pgn = Notation.generatePGN(board);
        const TEXTAREA = document.getElementById("pgn");
        // Obter apenas a sequência de movimentos
        TEXTAREA.value = pgn.replace(/\[.*?\]/g, '').trim();
        // TEXTAREA.value = pgn;
        TEXTAREA.scrollTop = TEXTAREA.scrollHeight; // Rolar para o final do textarea
        this.hideImportPGNError();
    }

    updateFEN(board) {
        board.fen = Notation.generateFEN(board);
        document.getElementById("fen").value = board.fen;
    }

    showImportPGNError(move, board) {
        const IMPORT_ERROR = document.getElementById("import-error");
        if (move === null) {
            IMPORT_ERROR.textContent = "PGN is empty";
        } else {
            const count = board.metadata.moves.indexOf(move);
            if (board.turn === WHITE) { // WHITE
                IMPORT_ERROR.textContent = `Invalid move: ${Math.floor(count / 2) + 1}. ${move}`;
            } else { // BLACK
                IMPORT_ERROR.textContent = `Invalid move: ${Math.floor(count / 2) + 1}. ... ${move}`;
            }
        }
        IMPORT_ERROR.style.visibility = "visible";
        this.game.isImportingGame = false;
    }

    showError(message) {
        const IMPORT_ERROR = document.getElementById("import-error");
        IMPORT_ERROR.textContent = message;
        IMPORT_ERROR.style.visibility = "visible";
        this.isImportingGame = false;
    }

    hideImportPGNError() {
        const IMPORT_ERROR = document.getElementById("import-error");
        IMPORT_ERROR.textContent = "";
        IMPORT_ERROR.style.visibility = "hidden";
    }

    showDraw(board) {
        // Obtem a referência do jogo atual
        const game = this.game;
        // PGN
        board.metadate.result = "1/2-1/2";
        // Atualiza a mensagem de empate
        document.getElementById("end-game-message").textContent = "Draw!\nStalemate.";
        // Exibe a mensagem de empate
        document.getElementById("end").style.display = "flex";
        // callback do botão restart
        document.getElementById("restart-button").addEventListener("click", function () {
            // Oculta a mensagem de empate
            document.getElementById("end").style.display = "none";
            // Reinicia o jogo
            game.restart(board);
        });

    }

    showCheckmate(board) {
        const game = this.game;
        // PGN
        board.metadata.result = board.selectedColor === WHITE ? "1-0" : "0-1";
        // Indica o vencedor
        let winner = board.selectedColor === WHITE ? "White" : "Black";
        // Atualiza a mensagem de xeque mate
        document.getElementById("end-game-message").textContent = "Checkmate!\n" + winner + " wins.";
        // Exibe a mensagem de xeque mate
        document.getElementById("end").style.display = "flex";
        // callback do botão restart
        document.getElementById("restart-button").addEventListener("click", function () {
            // Oculta a mensagem de xeque mate
            document.getElementById("end").style.display = "none";
            // Reinicia o jogo
            game.restart(board);
        });
    }
}
export default Renderer;