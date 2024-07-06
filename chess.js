/**
    @Autor Lucas Franco de Mello
    @Description Implementação de um jogo de xadrez com bitboards em JavaScript
    @Date 2024-06-27
*/

// Inicializa o Stockfish
// var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
// var stockfish = new Worker(wasmSupported ? './engine/stockfish.wasm.js' : './engine/stockfish.js');
// stockfish.addEventListener('message', function (e) {
//     console.log(e.data);
// });
// stockfish.postMessage('uci');

// Importação das constantes
import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING } from './constants/pieces.js';
import { WHITE, BLACK, PIECES_STRING } from './constants/colors.js';
import { NOT_1_RANK, NOT_8_RANK, NOT_A_FILE, NOT_H_FILE } from './constants/edges.js';
import { WHITE_ROOK_KINGSIDE, WHITE_ROOK_QUEENSIDE, BLACK_ROOK_KINGSIDE, BLACK_ROOK_QUEENSIDE } from './constants/castling.js';
import { CAPTURE_SOUND, CHECK_SOUND, FAILURE_SOUND, MOVE_SOUND } from './constants/sounds.js';

// Importação das funções
import { getPawnMoves } from './moves/pawn.js';
import { getRookMoves } from './moves/rook.js';
import { getKnightMoves } from './moves/knight.js';
import { getBishopMoves } from './moves/bishop.js';
import { getQueenMoves } from './moves/queen.js';
import { getKingMoves } from './moves/king.js';

/**
    @Bitboard
    Um bitboard é a representação das posições de peças do mesmo tipo e cor em um tabuleiro de xadrez.

    Exemplo de bitboard para os peões brancos:

         a b c d e f g h

    8    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    3    0 0 0 0 0 0 0 0
    2    1 1 1 1 1 1 1 1
    1    0 0 0 0 0 0 0 0

    BIN:
    00000000 00000000 00000000 00000000 00000000 00000000 11111111 00000000 
    HEX:
    0x000000000000FF00

    Exemplo de bitboard para os peões pretos:

    MAIS SIGNIFICATIVO ->   0 0 0 0 0 0 0 0 
                            1 1 1 1 1 1 1 1
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0  <- MENOS SIGNIFICATIVO

    BIN:
    00000000 11111111 00000000 00000000 00000000 00000000 00000000 00000000
    HEX:
    0x00FF000000000000
    
    @BigInt
    BigInt é um objeto embutido que fornece suporte para números inteiros maiores que 2^53 - 1.
    Sua representação é feita com a letra "n" no final.

    @OBS
    A leitura do bitboard é feita da direita para a esquerda

    1n = 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000001

    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 1

    1n << BigInt(63) = 10000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000

    1 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0
    0 0 0 0 0 0 0 0

*/

// Bitboards, para todas as peças
let bitboards = [
    new Array(6).fill(0n),  // 6 tipos de peças brancas
    new Array(6).fill(0n)   // 6 tipos de peças pretas
];

// Variáveis para as peças
let availableMoves = 0n; // bitboard com os movimentos disponíveis para a peça selecionada
let selectedPiece = null; // peça selecionada
let selectedColor = null; // cor da peça selecionada
let fromPosition = null; // posição de origem da peça
let toPosition = null; // posição de destino da peça

// Variáveis para o jogo
let enPassant = null; // Posição do peão que pode ser capturado com en passant
let currentTurn = WHITE; // Turno atual
let currentFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"; // FEN atual
let halfMoves = 0; // Contagem de 100 movimentos sem captura ou movimento de peão (meio movimento)
let fullMoves = 1; // Número total de movimentos completos
let kingCheckPosition = null; // Posição do rei em xeque

let availableCastling = WHITE_ROOK_KINGSIDE | WHITE_ROOK_QUEENSIDE | BLACK_ROOK_KINGSIDE | BLACK_ROOK_QUEENSIDE;

// Inicializa o tabuleiro de xadrez com as posições iniciais das peças.
function initializeBoard() {
    // Peões
    bitboards[BLACK][PAWN] = 0x00FF000000000000n;
    bitboards[WHITE][PAWN] = 0x000000000000FF00n;
    // Cavalos
    bitboards[BLACK][KNIGHT] = 0x4200000000000000n;
    bitboards[WHITE][KNIGHT] = 0x0000000000000042n;
    // Bispos
    bitboards[BLACK][BISHOP] = 0x2400000000000000n;
    bitboards[WHITE][BISHOP] = 0x0000000000000024n;
    // Torres
    bitboards[BLACK][ROOK] = 0x8100000000000000n;
    bitboards[WHITE][ROOK] = 0x0000000000000081n;
    // Rainhas
    bitboards[BLACK][QUEEN] = 0x1000000000000000n;
    bitboards[WHITE][QUEEN] = 0x0000000000000010n;
    // Reis
    bitboards[BLACK][KING] = 0x0800000000000000n;
    bitboards[WHITE][KING] = 0x0000000000000008n;
}

/** 
    @COMPORTAMENTO_DE_MEMORIA_PARA_REMOVER_PECA
 
    @FROM 8 (h2)

         a b c d e f g h

    8    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    3    0 0 0 0 0 0 0 0
    2    0 0 0 0 0 0 0 1
    1    0 0 0 0 0 0 0 0


    @BITBOARD_WHITE_PAWN

         a b c d e f g h

    8    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    3    0 0 0 0 0 0 0 0
    2    1 1 1 1 1 1 1 1
    1    0 0 0 0 0 0 0 0

                             bitboards[0][0]:      00000000 00000000 00000000 00000000 00000000 00000000 11111111 00000000 
                                        from:      8 (h2)

    @DESLOCAMENTO_A_ESQUERDA (Conversão da posição "from" para uma mascara de bits)
                          1n << BigInt(from):      00000000 00000000 00000000 00000000 00000000 00000000 00000001 00000000 
    
    @NOT
                       ~(1n << BigInt(from)):      11111111 11111111 11111111 11111111 11111111 11111111 11111110 11111111

    @AND
                             bitboards[0][0]:      00000000 00000000 00000000 00000000 00000000 00000000 11111111 00000000 
    bitboards[0][0] &= ~(1n << BigInt(from)):      00000000 00000000 00000000 00000000 00000000 00000000 11111110 00000000 

    @COMPORTAMENTO_DE_MEMORIA_PARA_ADICIONAR_PECA

    @TO 16 (h3)

         a b c d e f g h

    8    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    3    0 0 0 0 0 0 0 1
    2    0 0 0 0 0 0 0 0
    1    0 0 0 0 0 0 0 0
 
    @BITBOARD_PAWN_WHITE_POSICAO_8_REMOVIDA
 
         a b c d e f g h
 
    8    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    3    0 0 0 0 0 0 0 0
    2    1 1 1 1 1 1 1 0
    1    0 0 0 0 0 0 0 0

    @DESLOCAMENTO_A_ESQUERDA (Conversão da posição "to" para uma mascara de bits)
                         1n << BigInt(to):         00000000 00000000 00000000 00000000 00000000 00000001 00000000 00000000
 
    @OR
                          bitboards[0][0]:         00000000 00000000 00000000 00000000 00000000 00000000 11111110 00000000
    bitboards[0][0] |= (1n << BigInt(to)):         00000000 00000000 10000000 00000000 00000000 00000001 11111110 00000000
 
*/
function movePiece() {
    // Cor da peça adversária
    const OPPONENT_COLOR = selectedColor === WHITE ? BLACK : WHITE;
    // Bitboards das peças adversárias
    let opponentPices = bitboards[OPPONENT_COLOR][PAWN] | bitboards[OPPONENT_COLOR][KNIGHT] | bitboards[OPPONENT_COLOR][BISHOP]
        | bitboards[OPPONENT_COLOR][ROOK] | bitboards[OPPONENT_COLOR][QUEEN] | bitboards[OPPONENT_COLOR][KING];
    // Mascara de bits da nova posição
    const TO_MASK = 1n << BigInt(toPosition);

    if (availableMoves & TO_MASK) {

        // Incrementa os meios movimentos
        halfMoves++;
        // Remove a posição de origem da peça
        bitboards[selectedColor][selectedPiece] &= ~(1n << BigInt(fromPosition));
        // Adiciona a nova posição da peça
        bitboards[selectedColor][selectedPiece] |= TO_MASK;

        // Verifica se houve captura de peça
        if (TO_MASK & opponentPices) {
            // Iteração nas bitboards adversárias, para saber qual peça foi capturada
            for (let opponentPiece = 0; opponentPiece < 6; opponentPiece++) {
                if (bitboards[OPPONENT_COLOR][opponentPiece] & TO_MASK) {
                    // Remove a peça adversária
                    bitboards[OPPONENT_COLOR][opponentPiece] &= ~TO_MASK;
                    // Verifica se a peça capturada foi uma torre
                    if (opponentPiece === ROOK && availableCastling !== 0n) {
                        switch (TO_MASK) {
                            case WHITE_ROOK_QUEENSIDE:
                                availableCastling &= ~WHITE_ROOK_QUEENSIDE; // Remove Q
                                break;
                            case WHITE_ROOK_KINGSIDE:
                                availableCastling &= ~WHITE_ROOK_KINGSIDE; // Remove K
                                break;
                            case BLACK_ROOK_QUEENSIDE:
                                availableCastling &= ~BLACK_ROOK_QUEENSIDE; // Remove q
                                break;
                            case BLACK_ROOK_KINGSIDE:
                                availableCastling &= ~BLACK_ROOK_KINGSIDE; // Remove k
                                break;
                        }
                    }
                }
            }
            // Efeito sonoro de captura
            CAPTURE_SOUND.play();
            enPassant = null;
            halfMoves = 0;
        }

        switch (selectedPiece) {
            case PAWN:
                // Obtem os peões adversários
                const OPPONENT_PAWNS = selectedColor === WHITE ? bitboards[BLACK][PAWN] : bitboards[WHITE][PAWN];
                const CAPTURE_LEFT = selectedColor === WHITE ? fromPosition + 9 : fromPosition - 9;
                const CAPTURE_RIGHT = selectedColor === WHITE ? fromPosition + 7 : fromPosition - 7;

                // Verifica se o peão foi capturado pelo movimento en passant
                if ((enPassant !== null) && (toPosition === CAPTURE_LEFT || toPosition === CAPTURE_RIGHT)
                    && (OPPONENT_PAWNS & (1n << BigInt(enPassant)))) {
                    // remove o peão capturado
                    bitboards[OPPONENT_COLOR][PAWN] &= ~(1n << BigInt(enPassant));
                    // Efeito sonoro de captura
                    CAPTURE_SOUND.play();
                }

                // Verifica se o peão avançou duas casas em seu primeiro movimento
                if (Math.abs(fromPosition - toPosition) === 16) {
                    // Verifica se existe um peão adversário do lado esquerdo ou direito
                    if ((OPPONENT_PAWNS & (1n << BigInt(toPosition - 1)) && toPosition > 24) ||
                        (OPPONENT_PAWNS & (1n << BigInt(toPosition + 1)) && toPosition < 39)) {
                        // marca o própio peão para ser capturado pelo movimento en passant
                        enPassant = toPosition;
                    } else {
                        // Desmarca o peão que pode ser capturado en passant
                        enPassant = null;
                    }
                } else {
                    enPassant = null;
                }
                halfMoves = 0;
                break;
            case KING:
                // verifica se o movimento foi um roque
                if (Math.abs(fromPosition - toPosition) === 2) {
                    // adicionar rei na posição intermediaria
                    if ((1n << BigInt(toPosition)) & WHITE_ROOK_QUEENSIDE) {
                        //roque grande
                        console.log("WHITE_ROOK_QUEENSIDE");
                    }
                    else if ((1n << BigInt(toPosition)) & WHITE_ROOK_KINGSIDE) {
                        // roque pequeno
                        console.log("WHITE_ROOK_KINGSIDE");
                    }
                    else if ((1n << BigInt(toPosition)) & BLACK_ROOK_QUEENSIDE) {
                        // roque grande
                        console.log("BLACK_ROOK_QUEENSIDE");
                    }
                    else if ((1n << BigInt(toPosition)) & BLACK_ROOK_KINGSIDE) {
                        // roque pequeno
                        console.log("BLACK_ROOK_KINGSIDE");
                    }
                }
                if (selectedColor === WHITE) {
                    availableCastling &= ~(WHITE_ROOK_KINGSIDE | WHITE_ROOK_QUEENSIDE); // Remove KQ
                } else {
                    availableCastling &= ~(BLACK_ROOK_KINGSIDE | BLACK_ROOK_QUEENSIDE); // Remove kq
                }

                break;
            case ROOK:
                if (1n << BigInt(fromPosition) & availableCastling) {
                    switch (1n << BigInt(fromPosition)) {
                        case WHITE_ROOK_QUEENSIDE:
                            availableCastling &= ~WHITE_ROOK_QUEENSIDE; // Remove Q
                            break;
                        case WHITE_ROOK_KINGSIDE:
                            availableCastling &= ~WHITE_ROOK_KINGSIDE; // Remove K
                            break;
                        case BLACK_ROOK_QUEENSIDE:
                            availableCastling &= ~BLACK_ROOK_QUEENSIDE; // Remove q
                            break;
                        case BLACK_ROOK_KINGSIDE:
                            availableCastling &= ~BLACK_ROOK_KINGSIDE; // Remove k
                            break;
                    }
                }
                break;
        }

        // Verifica se o rei adversário está em xeque
        if (isKingInCheck(bitboards, OPPONENT_COLOR)) {

            // verifica se o rei adversário está em xeque mate
            // ...

            // Efeito sonoro de xeque
            CHECK_SOUND.play();
        }
        else {
            // Efeito sonoro de movimento
            MOVE_SOUND.play();
            kingCheckPosition = null;
        }

        // Contagem das jogadas completas
        if (currentTurn === BLACK) {
            fullMoves++;
        }

        // Atualiza o turno
        currentTurn = currentTurn === WHITE ? BLACK : WHITE;

        // Atualiza a FEN
        updateFEN();

    } else {
        // Efeito sonoro de movimento inválido
        FAILURE_SOUND.play();
        return;
    }
}

// Função auxiliar para transformar a peça em elemento HTML
function pieceToString(piece, color) {
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
function renderBoard() {
    const boardElement = document.getElementById("chessboard");
    boardElement.innerHTML = ""; // Limpa tabuleiro

    // Iteração das linhas
    for (let rank = 7; rank >= 0; rank--) {
        let row = document.createElement("tr"); // table row
        // Iteração das colunas
        for (let file = 7; file >= 0; file--) {
            const index = rank * 8 + file; // index do quadrado
            let square = document.createElement("td"); // table data
            if (kingCheckPosition === rank * 8 + file) {
                square.className = "check";
            }
            else {
                square.className = (rank + file) % 2 === 0 ? "white" : "black"; // alternância de cores
            }

            if (fromPosition === index) {
                square.classList.add("selected_white");
            }
            // Adiciona a decoração dos movimentos possíveis
            if (availableMoves & (1n << BigInt(index))) {
                const OPPONENT_COLOR = selectedColor === WHITE ? BLACK : WHITE;
                const OPPONENT_PIECES = bitboards[OPPONENT_COLOR][PAWN] | bitboards[OPPONENT_COLOR][KNIGHT] | bitboards[OPPONENT_COLOR][BISHOP]
                    | bitboards[OPPONENT_COLOR][ROOK] | bitboards[OPPONENT_COLOR][QUEEN] | bitboards[OPPONENT_COLOR][KING];
                if (OPPONENT_PIECES & (1n << BigInt(index))) {
                    square.classList.add("capture");
                }
                else {
                    square.classList.add("available");
                }
            }

            square.dataset.index = index; // armazena o index do quadrado
            square.addEventListener("click", handleSquareClick); // adiciona o evento de clique
            row.appendChild(square); // adiciona a quadrado na linha
        }
        boardElement.appendChild(row); // adiciona a linha ao tabuleiro
    }

    // Atualização das peças no tabuleiro
    updatePiecesOnBoard();
}

// Função para atualizar todas as peças no tabuleiro
function updatePiecesOnBoard() {
    // Obtem o tabuleiro
    const boardElement = document.getElementById("chessboard");
    // Limpar peças existentes no tabuleiro
    boardElement.querySelectorAll(".piece").forEach(piece => piece.remove());
    // Adicionar peças atuais ao tabuleiro
    for (let color = 0; color < 2; color++) {
        // Iteração de todas as peças
        for (let piece = 0; piece < 6; piece++) {
            let bitboard = bitboards[color][piece]; // Obtem o bitboard da peça
            // Iteração de cada bit do bitboard
            for (let i = 0; i < 64; i++) {
                if (bitboard & (1n << BigInt(i))) {
                    addPieceToBoard(i, piece, color); // Adiciona a peça ao tabuleiro
                }
            }
        }
    }
}

// Função para adicionar uma peça no tabuleiro
function addPieceToBoard(index, piece, color) {
    // Obtem o tabuleiro
    const boardElement = document.getElementById("chessboard");
    // Obtem a casa do tabuleiro
    const square = boardElement.querySelector(`[data-index="${index}"]`);
    // Remove qualquer peça existente no quadrado
    square.innerHTML = "";
    // Cria o elemento para inserir a peça
    const pieceDiv = document.createElement("div");
    pieceDiv.className = `piece ${pieceToString(piece, color)}`;
    square.appendChild(pieceDiv); // Adiciona a peça no quadrado
}

// Verificações que antecedem o movimento da peça
function onMove(position) {
    // Verifica se a peça ainda não foi selecionada
    if (fromPosition === null) {
        for (let color = 0; color < 2; color++) {
            for (let piece = 0; piece < 6; piece++) {
                if (bitboards[color][piece] & (1n << BigInt(position))) {
                    // Verifica se a peça pertence ao jogador do turno atual
                    if (color !== currentTurn) {
                        return;
                    }
                    // Obtem o tipo da peça, a cor e a posição de origem
                    selectedPiece = piece;
                    selectedColor = color;
                    fromPosition = position;

                    if (isKingInCheck(bitboards, selectedColor)) {
                        // verifica se é xeque mate
                    }
                    else if (isPinned(fromPosition)) {
                        // Permite apenas a captura da peça que está fazendo o xeque
                        if (availableMoves !== 0n) break;
                        selectedPiece = null;
                        selectedColor = null;
                        fromPosition = null;
                        availableMoves = 0n;
                        // Efeito sonoro de movimento inválido
                        FAILURE_SOUND.play();
                        // Marca o próprio rei
                        for (let i = 0; i < 64; i++) {
                            if (bitboards[color][KING] & (1n << BigInt(i))) {
                                kingCheckPosition = i;
                                break;
                            }
                        }
                        break;
                    }
                    // Verifica os movimentos possíveis para a peça selecionada
                    switch (selectedPiece) {
                        case PAWN:
                            availableMoves = getPawnMoves(fromPosition, selectedColor, bitboards, enPassant);
                            break;
                        case ROOK:
                            availableMoves = getRookMoves(fromPosition, selectedColor, bitboards);
                            break;
                        case KNIGHT:
                            availableMoves = getKnightMoves(fromPosition, selectedColor, bitboards);
                            break;
                        case BISHOP:
                            availableMoves = getBishopMoves(fromPosition, selectedColor, bitboards);
                            break;
                        case QUEEN:
                            availableMoves = getQueenMoves(fromPosition, selectedColor, bitboards);
                            break;
                        case KING:
                            availableMoves = getKingMoves(fromPosition, selectedColor, bitboards);
                            break;
                        default:
                            console.log("Piece not found!");
                            break;
                    }
                }
            }
        }
    } else {
        // Obtem a posição de destino
        toPosition = position;
        // Obtem as peças do jogador atual
        const OWN_PIECES = bitboards[currentTurn][PAWN] | bitboards[currentTurn][KNIGHT] | bitboards[currentTurn][BISHOP]
            | bitboards[currentTurn][ROOK] | bitboards[currentTurn][QUEEN] | bitboards[currentTurn][KING];
        // Verifica se a peça de origem é da mesma cor que a de destino
        if (OWN_PIECES & (1n << BigInt(toPosition))) {
            fromPosition = null;
            selectedColor = null;
            availableMoves = 0n;
            kingCheckPosition = null;
            // Refaz a seleção da peça
            onMove(toPosition);
            return;
        } else {
            // Verifica se o movimento não é ilegal
            if (!isIllegalMove()) {
                // Movimenta a peça a partir das variaveis definidas no escopo global
                movePiece();
            }
            else {
                // Efeito sonoro de movimento inválido
                FAILURE_SOUND.play();
                // Desmarca o rei que foi marcado na verificação do movimento ilegal
                kingCheckPosition = null;
            }
        }
        // Atualiza as variáveis para o próximo movimento
        fromPosition = null;
        selectedColor = null;
        toPosition = null;
        availableMoves = 0n;
    }
    renderBoard(); // Renderiza o tabuleiro
    kingCheckPosition = null;
}

// Função para lidar com o clique no quadrado da tabela
function handleSquareClick(event) {
    // Obtem o indice do quadrado clicado
    const index = parseInt(event.currentTarget.dataset.index);
    // Verificações que antecedem o movimento
    onMove(index);
}

// Inicializa o tabuleiro e renderiza
initializeBoard();
renderBoard();

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

function generateFEN() {
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
                if (bitboards[WHITE][i] & (1n << BigInt(index))) {
                    // Converte a peça para a notação FEN
                    piece = PIECES[i].toUpperCase();
                    break;
                } else if (bitboards[BLACK][i] & (1n << BigInt(index))) {
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
    fen += currentTurn === WHITE ? " w " : " b ";

    // Obtem as possibilidades de roque
    fen += getCastlingFEN();

    // Verifica se existe a possibilidade de captura en passant
    if (enPassant !== null) {
        // converte a posição en passant para a notação FEN
        const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"];
        let y = LETTERS[7 - (enPassant % 8)];
        let x = 1 + Math.trunc(enPassant / 8);
        // Adiciona a posição de captura do en passant ao FEN
        x += currentTurn === WHITE ? 1 : -1;
        fen += " " + y + x + " ";
    } else {
        fen += " - ";
    }

    // Contador de meios movimentos
    fen += halfMoves + " ";
    // Adiciona o número de jogadas completas
    fen += fullMoves;

    return fen;
}

function updateFEN() {
    currentFEN = generateFEN();
    document.getElementById("fen").value = currentFEN;
}

// Verificação do estado dos roques disponíveis
function getCastlingFEN() {
    let result = '';
    if (availableCastling & WHITE_ROOK_KINGSIDE) result += 'K';
    if (availableCastling & WHITE_ROOK_QUEENSIDE) result += 'Q';
    if (availableCastling & BLACK_ROOK_KINGSIDE) result += 'k';
    if (availableCastling & BLACK_ROOK_QUEENSIDE) result += 'q';
    return result || '-';
}

function getAllMoves(color, bitboards) {
    let moves = 0n;
    // Iteração das peças
    for (let piece = 0; piece < 6; piece++) {
        let bitboard = bitboards[color][piece];
        // Iteração das posições presentes em cada bitboard
        for (let i = 0; i < 64; i++) {
            if (bitboard & (1n << BigInt(i))) {
                switch (piece) {
                    case PAWN:
                        moves |= getPawnMoves(i, color, bitboards, enPassant);
                        break;
                    case ROOK:
                        moves |= getRookMoves(i, color, bitboards);
                        break;
                    case KNIGHT:
                        moves |= getKnightMoves(i, color, bitboards);
                        break;
                    case BISHOP:
                        moves |= getBishopMoves(i, color, bitboards);
                        break;
                    case QUEEN:
                        moves |= getQueenMoves(i, color, bitboards);
                        break;
                    case KING:
                        moves |= getKingMoves(i, color, bitboards);
                        break;
                }
            }
        }
    }
    return moves;
}

// Verifica se a peça está cravada
function isPinned(fromPosition) {

    // Copia o estado atual das peças
    let tempBitboards = [
        bitboards[WHITE].map(bitboard => BigInt(bitboard)), // Copia o array de peças brancas
        bitboards[BLACK].map(bitboard => BigInt(bitboard))  // Copia o array de peças pretas
    ];

    const KING_MASK = tempBitboards[selectedColor][KING];
    const OPPONENT_COLOR = selectedColor === WHITE ? BLACK : WHITE;

    // remove a peça da posição de origem
    tempBitboards[selectedColor][selectedPiece] &= ~(1n << BigInt(fromPosition));

    // peça que está atacando o rei
    let positionAttackerMask = 0n;
    const ENEMY_MOVES = getAllMoves(OPPONENT_COLOR, tempBitboards);

    // verifica se o bitboard do rei coincide com algum bit de todos os movimentos de ataque das peças inimigas
    if (KING_MASK & ENEMY_MOVES) {
        // Verifica a posição de quem realiza o ataque descoberto
        for (let piece = 0; piece < 6; piece++) {
            let bitboard = tempBitboards[OPPONENT_COLOR][piece];
            for (let i = 0; i < 64; i++) {
                if (bitboard & (1n << BigInt(i))) {
                    switch (piece) {
                        case ROOK:
                            if (getRookMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                                positionAttackerMask |= 1n << BigInt(i);
                            }
                            break;
                        case BISHOP:
                            if (getBishopMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                                positionAttackerMask |= 1n << BigInt(i);
                            }
                            break;
                        case QUEEN:
                            if (getQueenMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                                positionAttackerMask |= 1n << BigInt(i);
                            }
                            break;
                    }
                }
            }
        }
        // Verifica se a peça cravada pode capturar quem ta atacando o rei
        let defenderMoves;
        switch (selectedPiece) {
            case PAWN:
                defenderMoves = getPawnMoves(fromPosition, selectedColor, tempBitboards, null);
                break;
            case ROOK:
                defenderMoves = getRookMoves(fromPosition, selectedColor, tempBitboards);
                break;
            case KNIGHT:
                defenderMoves = getKnightMoves(fromPosition, selectedColor, tempBitboards);
                break;
            case BISHOP:
                defenderMoves = getBishopMoves(fromPosition, selectedColor, tempBitboards);
                break;
            case QUEEN:
                defenderMoves = getQueenMoves(fromPosition, selectedColor, tempBitboards);
                break;
        }
        if (positionAttackerMask & defenderMoves) {
            availableMoves = positionAttackerMask & defenderMoves;
        }
        return true;
    }
    return false;
}
function isIllegalMove() {
    const OPPONENT_COLOR = selectedColor === WHITE ? BLACK : WHITE;
    // Copia o estado atual das peças
    let tempBitboards = [
        bitboards[WHITE].map(bitboard => BigInt(bitboard)),
        bitboards[BLACK].map(bitboard => BigInt(bitboard))
    ];
    // Remove a posição de origem
    tempBitboards[selectedColor][selectedPiece] &= ~(1n << BigInt(fromPosition));
    // Adiciona na nova posição
    tempBitboards[selectedColor][selectedPiece] |= 1n << BigInt(toPosition);
    // remove a peça adversária da posição de destino
    for (let p = 0; p < 6; p++) {
        tempBitboards[OPPONENT_COLOR][p] &= ~(1n << BigInt(toPosition));
    }
    // Retorna verdadeiro se o rei estiver em xeque
    return isKingInCheck(tempBitboards, selectedColor);
}

// Verifica se o rei está em xeque
function isKingInCheck(bitboards, color) {
    const OPPONENT_COLOR = color === WHITE ? BLACK : WHITE;
    if (bitboards[color][KING] & getAllMoves(OPPONENT_COLOR, bitboards)) {
        for (let i = 0; i < 64; i++) {
            if (bitboards[color][KING] & (1n << BigInt(i))) {
                kingCheckPosition = i;
            }
        }
        return true;
    }
    return false;
}