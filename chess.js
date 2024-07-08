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
import { WHITE_ROOK_KINGSIDE, WHITE_ROOK_QUEENSIDE, BLACK_ROOK_KINGSIDE, BLACK_ROOK_QUEENSIDE } from './constants/castling.js';
import { CAPTURE_SOUND, CHECK_SOUND, END_SOUND, FAILURE_SOUND, MOVE_SOUND } from './constants/sounds.js';

// Importação das funções
import { getPawnMoves, getCaptureRight, getCaptureLeft } from './moves/pawn.js';
import { getRookMoves, getR, getL, getU, getD } from './moves/rook.js';
import { getKnightMoves } from './moves/knight.js';
import { getBishopMoves, getUR, getUL, getLL, getLR } from './moves/bishop.js';
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
let checkMask = 0n; // Máscara do rei em xeque
let availableCastlingMask = WHITE_ROOK_KINGSIDE | WHITE_ROOK_QUEENSIDE | BLACK_ROOK_KINGSIDE | BLACK_ROOK_QUEENSIDE; // Máscara para os roques disponíveis

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
                    if (opponentPiece === ROOK && availableCastlingMask !== 0n) {
                        switch (TO_MASK) {
                            case WHITE_ROOK_QUEENSIDE:
                                availableCastlingMask &= ~WHITE_ROOK_QUEENSIDE; // Remove Q
                                break;
                            case WHITE_ROOK_KINGSIDE:
                                availableCastlingMask &= ~WHITE_ROOK_KINGSIDE; // Remove K
                                break;
                            case BLACK_ROOK_QUEENSIDE:
                                availableCastlingMask &= ~BLACK_ROOK_QUEENSIDE; // Remove q
                                break;
                            case BLACK_ROOK_KINGSIDE:
                                availableCastlingMask &= ~BLACK_ROOK_KINGSIDE; // Remove k
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
                    availableCastlingMask &= ~(WHITE_ROOK_KINGSIDE | WHITE_ROOK_QUEENSIDE); // Remove KQ
                } else {
                    availableCastlingMask &= ~(BLACK_ROOK_KINGSIDE | BLACK_ROOK_QUEENSIDE); // Remove kq
                }

                break;
            case ROOK:
                if (1n << BigInt(fromPosition) & availableCastlingMask) {
                    switch (1n << BigInt(fromPosition)) {
                        case WHITE_ROOK_QUEENSIDE:
                            availableCastlingMask &= ~WHITE_ROOK_QUEENSIDE; // Remove Q
                            break;
                        case WHITE_ROOK_KINGSIDE:
                            availableCastlingMask &= ~WHITE_ROOK_KINGSIDE; // Remove K
                            break;
                        case BLACK_ROOK_QUEENSIDE:
                            availableCastlingMask &= ~BLACK_ROOK_QUEENSIDE; // Remove q
                            break;
                        case BLACK_ROOK_KINGSIDE:
                            availableCastlingMask &= ~BLACK_ROOK_KINGSIDE; // Remove k
                            break;
                    }
                }
                break;
        }

        // Verifica se o rei adversário está em xeque
        let opponentCheck = isKingInCheck(bitboards, OPPONENT_COLOR);
        if (opponentCheck) {
            checkMask = opponentCheck; // Marca o rei adversário
            // verifica se o rei adversário está em xeque mate
            if (getAllDefenderMovesMask(bitboards, OPPONENT_COLOR) === 0n) {
                // Efeito sonoro de xeque mate
                END_SOUND.play();

                let winner = selectedColor === WHITE ? "White" : "Black";
                // Atualiza a mensagem de xeque mate
                document.getElementById("end-game-message").textContent = "Checkmate!\n" + winner + " wins.";
                // Exibe a mensagem de xeque mate
                document.getElementById("end").style.display = "flex";

                // callback do botão restart
                document.getElementById("restart-button").addEventListener("click", function () {
                    // Oculta a mensagem de xeque mate
                    document.getElementById("end").style.display = "none";
                    // Reinicia o jogo
                    restart();
                });
            }
            else {
                // Efeito sonoro de xeque
                CHECK_SOUND.play();
            }
        }
        else {
            // Efeito sonoro de movimento
            MOVE_SOUND.play();
            checkMask = 0n;
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
            if (checkMask === 1n << BigInt(index)) {
                square.className = "check";
            }
            else {
                square.className = (rank + file) % 2 === 0 ? "white" : "black"; // alternância de cores
            }

            if (fromPosition === index) {
                square.classList.add("selected");
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
                    // Redefine a máscara de movimentos disponíveis
                    availableMoves = 0n;


                    // Verifica se o rei está em xeque
                    if (isKingInCheck(bitboards, selectedColor)) {
                        // movimentos possiveis para se defender do xeque
                        let allDefenderMoves = getAllDefenderMovesMask(bitboards, color);
                        // Verifica se a peça pode se mover para defender o rei
                        if (getPieceMovesMask(fromPosition, selectedPiece, selectedColor, bitboards) & allDefenderMoves) {
                            availableMoves = getPieceMovesMask(fromPosition, selectedPiece, selectedColor, bitboards) & allDefenderMoves;
                        }
                        break;
                    }
                    // Verifica se a peça está cravada e pode se mover
                    else if (isPinnedMask(fromPosition, bitboards) != null && isPinnedMask(fromPosition, bitboards)) {
                        availableMoves = isPinnedMask(fromPosition, bitboards);
                        break;
                    }
                    // Verifica se a peça está cravada e não pode se mover
                    else if (isPinnedMask(fromPosition, bitboards) != null && !(isPinnedMask(fromPosition, bitboards))) {
                        availableMoves = 0n;
                        break;
                    }
                    availableMoves = getPieceMovesMask(fromPosition, selectedPiece, selectedColor, bitboards);
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
                checkMask = 0n;
            }
        }
        // Atualiza as variáveis para o próximo movimento
        fromPosition = null;
        selectedColor = null;
        toPosition = null;
        availableMoves = 0n;
    }
    renderBoard(); // Renderiza o tabuleiro
    checkMask = 0n; // Desmarca o rei em xeque
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
    if (availableCastlingMask & WHITE_ROOK_KINGSIDE) result += 'K';
    if (availableCastlingMask & WHITE_ROOK_QUEENSIDE) result += 'Q';
    if (availableCastlingMask & BLACK_ROOK_KINGSIDE) result += 'k';
    if (availableCastlingMask & BLACK_ROOK_QUEENSIDE) result += 'q';
    return result || '-';
}

/**
 * Obtem a máscara de bits de todos os movimentos possíveis
 * @param {Integer} color 
 * @param {Array<Array<BigInt>>} bitboards
 * @returns 
 */
function getAllMovesMask(color, bitboards) {
    let moves = 0n;
    // Iteração das peças
    for (let piece = 0; piece < 6; piece++) {
        let bitboard = bitboards[color][piece];
        // Iteração das posições presentes em cada bitboard
        for (let i = 0; i < 64; i++) {
            if (bitboard & (1n << BigInt(i))) {
                moves |= getPieceMovesMask(i, piece, color, bitboards);
            }
        }
    }
    return moves;
}


/**
 * Verifica se a peça está cravada
 * @param {Integer} fromPosition 
 * @param {Array<Array<BigInt>>} bitboards
 * @returns null se a peça não está cravada, caso contrário retorna a mascara de bits dos movimentos possíveis	
 */
function isPinnedMask(fromPosition, bitboards) {

    // Copia o estado atual das peças
    let tempBitboards = [
        bitboards[WHITE].map(bitboard => BigInt(bitboard)), // Copia o array de peças brancas
        bitboards[BLACK].map(bitboard => BigInt(bitboard))  // Copia o array de peças pretas
    ];
    let piece;
    let color;
    for (let i = 0; i < 6; i++) {
        if (tempBitboards[WHITE][i] & (1n << BigInt(fromPosition))) {
            color = WHITE;
            piece = i;
            break;
        } else if (tempBitboards[BLACK][i] & (1n << BigInt(fromPosition))) {
            color = BLACK;
            piece = i;
            break;
        }
    }

    const KING_MASK = tempBitboards[color][KING];
    const OPPONENT_COLOR = color === WHITE ? BLACK : WHITE;

    // remove a peça da posição de origem
    tempBitboards[color][piece] &= ~(1n << BigInt(fromPosition));

    // Mascara de bits do ataque (posição da peça e quadrados atacados)
    let attackerMask = 0n;
    const ENEMY_MOVES = getAllMovesMask(OPPONENT_COLOR, tempBitboards);

    // verifica se o bitboard do rei coincide com algum bit de todos os movimentos de ataque das peças inimigas
    if (KING_MASK & ENEMY_MOVES) {
        // Verifica a posição de quem realiza o ataque descoberto
        for (let p = 0; p < 6; p++) {
            // Obtem o bitboard da peça
            let bitboard = tempBitboards[OPPONENT_COLOR][p];
            // Obtem a posição da peça atacante
            for (let i = 0; i < 64; i++) {
                // Verifica se existe uma peça na posição i
                if (bitboard & (1n << BigInt(i))) {
                    // Escolhe o tipo da peça
                    switch (p) {
                        case ROOK:
                            // Verifica se a peça pode atacar o rei
                            if (getRookMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                                attackerMask |= 1n << BigInt(i);
                                // Obtem a direção do ataque
                                // Ataca o rei na direita
                                let rightMoves = getR(i, OPPONENT_COLOR, tempBitboards);
                                if (rightMoves & KING_MASK) {
                                    attackerMask |= rightMoves;
                                    break;
                                }
                                // Ataca o rei na esquerda
                                let leftMoves = getL(i, OPPONENT_COLOR, tempBitboards);
                                if (leftMoves & KING_MASK) {
                                    attackerMask |= leftMoves;
                                    break;
                                }
                                // Ataca o rei para cima
                                let upMoves = getU(i, OPPONENT_COLOR, tempBitboards);
                                if (upMoves & KING_MASK) {
                                    attackerMask |= upMoves;
                                    break;
                                }
                                // Ataca o rei para baixo
                                let downMoves = getD(i, OPPONENT_COLOR, tempBitboards);
                                if (downMoves & KING_MASK) {
                                    attackerMask |= downMoves;
                                    break;
                                }
                            }
                            break;
                        case BISHOP:
                            // Verifica se a peça pode atacar o rei
                            if (getBishopMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                                attackerMask |= 1n << BigInt(i);
                                // Obtem a direção do ataque
                                // Ataca o rei na diagonal superior direita
                                let upperRightMoves = getUR(i, OPPONENT_COLOR, tempBitboards);
                                if (upperRightMoves & KING_MASK) {
                                    attackerMask |= upperRightMoves;
                                    break;
                                }
                                // Ataca o rei na diagonal superior esquerda
                                let upperLeftMoves = getUL(i, OPPONENT_COLOR, tempBitboards);
                                if (upperLeftMoves & KING_MASK) {
                                    attackerMask |= upperLeftMoves;
                                    break;
                                }
                                // Ataca o rei na diagonal inferior direita
                                let lowerRightMoves = getLR(i, OPPONENT_COLOR, tempBitboards);
                                if (lowerRightMoves & KING_MASK) {
                                    attackerMask |= lowerRightMoves;
                                    break;
                                }
                                // Ataca o rei na diagonal inferior esquerda
                                let lowerLeftMoves = getLL(i, OPPONENT_COLOR, tempBitboards);
                                if (lowerLeftMoves & KING_MASK) {
                                    attackerMask |= lowerLeftMoves;
                                    break;
                                }
                            }
                            break;
                        case QUEEN:
                            // Verifica se a peça pode atacar o rei
                            if (getQueenMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                                attackerMask |= 1n << BigInt(i);
                                // Obtem a direção do ataque
                                // Ataca o rei na direita
                                let rightMoves = getR(i, OPPONENT_COLOR, tempBitboards);
                                if (rightMoves & KING_MASK) {
                                    attackerMask |= rightMoves;
                                    break;
                                }
                                // Ataca o rei na esquerda
                                let leftMoves = getL(i, OPPONENT_COLOR, tempBitboards);
                                if (leftMoves & KING_MASK) {
                                    attackerMask |= leftMoves;
                                    break;
                                }
                                // Ataca o rei para cima
                                let upMoves = getU(i, OPPONENT_COLOR, tempBitboards);
                                if (upMoves & KING_MASK) {
                                    attackerMask |= upMoves;
                                    break;
                                }
                                // Ataca o rei para baixo
                                let downMoves = getD(i, OPPONENT_COLOR, tempBitboards);
                                if (downMoves & KING_MASK) {
                                    attackerMask |= downMoves;
                                    break;
                                }
                                // Ataca o rei na diagonal superior direita
                                let upperRightMoves = getUR(i, OPPONENT_COLOR, tempBitboards);
                                if (upperRightMoves & KING_MASK) {
                                    attackerMask |= upperRightMoves;
                                    break;
                                }
                                // Ataca o rei na diagonal superior esquerda
                                let upperLeftMoves = getUL(i, OPPONENT_COLOR, tempBitboards);
                                if (upperLeftMoves & KING_MASK) {
                                    attackerMask |= upperLeftMoves;
                                    break;
                                }
                                // Ataca o rei na diagonal inferior direita
                                let lowerRightMoves = getLR(i, OPPONENT_COLOR, tempBitboards);
                                if (lowerRightMoves & KING_MASK) {
                                    attackerMask |= lowerRightMoves;
                                    break;
                                }
                                // Ataca o rei na diagonal inferior esquerda
                                let lowerLeftMoves = getLL(i, OPPONENT_COLOR, tempBitboards);
                                if (lowerLeftMoves & KING_MASK) {
                                    attackerMask |= lowerLeftMoves;
                                    break;
                                }
                            }
                            break;
                        default:
                            break;
                    }
                }
            }
        }
        // Verifica se a peça cravada pode capturar quem ta atacando o rei ou entrar na linha de ataque
        let defenderMoves = 0n;
        switch (piece) {
            case PAWN:
                defenderMoves = getPawnMoves(fromPosition, color, tempBitboards, null);
                break;
            case ROOK:
                defenderMoves = getRookMoves(fromPosition, color, tempBitboards);
                break;
            case KNIGHT:
                defenderMoves = getKnightMoves(fromPosition, color, tempBitboards);
                break;
            case BISHOP:
                defenderMoves = getBishopMoves(fromPosition, color, tempBitboards);
                break;
            case QUEEN:
                defenderMoves = getQueenMoves(fromPosition, color, tempBitboards);
                break;
        }
        if (attackerMask & defenderMoves) {
            return attackerMask & defenderMoves;
        }
        return 0n;
    }
    return null;
}

// Verifica se o movimento é ilegal a partir das variaveis globais
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

/**
 * Verifica se o rei está em xeque
 * @param {Array<Array<BigInt>>} bitboards
 * @param {Integer} color 
 * @returns mascara de bits do rei em xeque ou 0n se não estiver em xeque
 */
function isKingInCheck(bitboards, color) {
    const OPPONENT_COLOR = color === WHITE ? BLACK : WHITE;
    if (bitboards[color][KING] & getAllMovesMask(OPPONENT_COLOR, bitboards)) {
        return bitboards[color][KING];
    }
    return 0n;
}

/**
 * Obtem os movimentos possíveis de uma peça
 * @param {Integer} from
 * @param {Integer} piece
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns mascara dos movimentos da peça
 */
function getPieceMovesMask(from, piece, color, bitboards) {
    let moves = 0n;
    switch (piece) {
        case PAWN:
            moves |= getPawnMoves(from, color, bitboards, enPassant);
            break;
        case ROOK:
            moves |= getRookMoves(from, color, bitboards);
            break;
        case KNIGHT:
            moves |= getKnightMoves(from, color, bitboards);
            break;
        case BISHOP:
            moves |= getBishopMoves(from, color, bitboards);
            break;
        case QUEEN:
            moves |= getQueenMoves(from, color, bitboards);
            break;
        case KING:
            let tempMoves = getKingMoves(from, color, bitboards);
            // obtem o ataque das peças inimigas
            let opponentMoves = 0n;
            for (let p = 0; p < 6; p++) {
                switch (p) {
                    case PAWN:
                        opponentMoves |= getPawnMoves(from, color === WHITE ? BLACK : WHITE, bitboards, null);
                        break;
                    case ROOK:
                        opponentMoves |= getRookMoves(from, color === WHITE ? BLACK : WHITE, bitboards);
                        break;
                    case KNIGHT:
                        opponentMoves |= getKnightMoves(from, color === WHITE ? BLACK : WHITE, bitboards);
                        break;
                    case BISHOP:
                        opponentMoves |= getBishopMoves(from, color === WHITE ? BLACK : WHITE, bitboards);
                        break;
                    case QUEEN:
                        opponentMoves |= getQueenMoves(from, color === WHITE ? BLACK : WHITE, bitboards);
                        break;
                    case KING:
                        opponentMoves |= getKingMoves(from, color === WHITE ? BLACK : WHITE, bitboards);
                        break;
                }
            }
            // remove os movimentos que atacam o rei
            moves |= tempMoves & ~opponentMoves;
            break;
        default:
            throw new Error("Piece not found!");
    }
    return moves;
}

/**
 * Obtem todos os movimentos possíveis para a defesa do rei
 * @param {Array<Array<BigInt>>} bitboards
 * @param {Integer} color 
 * @returns mascara de bits dos movimentos possíveis de defesa
 */
function getAllDefenderMovesMask(bitboards, color) {

    // Mascara de bits dos movimentos de defesa
    let defenderMask = 0n;

    // Copia o estado atual das peças
    let tempBitboards = [
        bitboards[WHITE].map(bitboard => BigInt(bitboard)), // Copia o array de peças brancas
        bitboards[BLACK].map(bitboard => BigInt(bitboard))  // Copia o array de peças pretas
    ];

    const KING_MASK = bitboards[color][KING];
    const OPPONENT_COLOR = color === WHITE ? BLACK : WHITE;
    const ENEMY_ALL_MOVES = getAllMovesMask(OPPONENT_COLOR, tempBitboards);

    // Mascara de bits dos ataques ao rei
    let attackerMask = 0n;
    // Posição das peças atacantes
    let attackerPositionMask = 0n;
    let attackersCount = 0;

    // Verifica a posição de quem realiza os ataques
    for (let p = 0; p < 6; p++) {
        // Obtem o bitboard da peça
        let bitboard = tempBitboards[OPPONENT_COLOR][p];
        // Obtem a posição da(s) peça(s) atacante(s) e os movimentos de ataque
        for (let i = 0; i < 64; i++) {
            // Verifica se existe uma peça na posição i
            if (bitboard & (1n << BigInt(i))) {
                // Escolhe o tipo da peça
                switch (p) {
                    case ROOK:
                        // Verifica se a torre ataca o rei
                        if (getRookMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            // Obtem a direção do ataque
                            // Ataca o rei na direita
                            let rightMoves = getR(i, OPPONENT_COLOR, tempBitboards);
                            if (rightMoves & KING_MASK) {
                                attackerMask |= rightMoves;
                                break;
                            }
                            // Ataca o rei na esquerda
                            let leftMoves = getL(i, OPPONENT_COLOR, tempBitboards);
                            if (leftMoves & KING_MASK) {
                                attackerMask |= leftMoves;
                                break;
                            }
                            // Ataca o rei para cima
                            let upMoves = getU(i, OPPONENT_COLOR, tempBitboards);
                            if (upMoves & KING_MASK) {
                                attackerMask |= upMoves;
                                break;
                            }
                            // Ataca o rei para baixo
                            let downMoves = getD(i, OPPONENT_COLOR, tempBitboards);
                            if (downMoves & KING_MASK) {
                                attackerMask |= downMoves;
                                break;
                            }
                        }
                        break;
                    case BISHOP:
                        // Verifica se o bispo ataca o rei
                        if (getBishopMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            // Obtem a direção do ataque
                            // Ataca o rei na diagonal superior direita
                            let upperRightMoves = getUR(i, OPPONENT_COLOR, tempBitboards);
                            if (upperRightMoves & KING_MASK) {
                                attackerMask |= upperRightMoves;
                                break;
                            }
                            // Ataca o rei na diagonal superior esquerda
                            let upperLeftMoves = getUL(i, OPPONENT_COLOR, tempBitboards);
                            if (upperLeftMoves & KING_MASK) {
                                attackerMask |= upperLeftMoves;
                                break;
                            }
                            // Ataca o rei na diagonal inferior direita
                            let lowerRightMoves = getLR(i, OPPONENT_COLOR, tempBitboards);
                            if (lowerRightMoves & KING_MASK) {
                                attackerMask |= lowerRightMoves;
                                break;
                            }
                            // Ataca o rei na diagonal inferior esquerda
                            let lowerLeftMoves = getLL(i, OPPONENT_COLOR, tempBitboards);
                            if (lowerLeftMoves & KING_MASK) {
                                attackerMask |= lowerLeftMoves;
                                break;
                            }
                        }
                        break;
                    case QUEEN:
                        // Verifica se a dama ataca o rei
                        if (getQueenMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            // Obtem a direção do ataque
                            // Ataca o rei na direita
                            let rightMoves = getR(i, OPPONENT_COLOR, tempBitboards);
                            if (rightMoves & KING_MASK) {
                                attackerMask |= rightMoves;
                                break;
                            }
                            // Ataca o rei na esquerda
                            let leftMoves = getL(i, OPPONENT_COLOR, tempBitboards);
                            if (leftMoves & KING_MASK) {
                                attackerMask |= leftMoves;
                                break;
                            }
                            // Ataca o rei para cima
                            let upMoves = getU(i, OPPONENT_COLOR, tempBitboards);
                            if (upMoves & KING_MASK) {
                                attackerMask |= upMoves;
                                break;
                            }
                            // Ataca o rei para baixo
                            let downMoves = getD(i, OPPONENT_COLOR, tempBitboards);
                            if (downMoves & KING_MASK) {
                                attackerMask |= downMoves;
                                break;
                            }
                            // Ataca o rei na diagonal superior direita
                            let upperRightMoves = getUR(i, OPPONENT_COLOR, tempBitboards);
                            if (upperRightMoves & KING_MASK) {
                                attackerMask |= upperRightMoves;
                                break;
                            }
                            // Ataca o rei na diagonal superior esquerda
                            let upperLeftMoves = getUL(i, OPPONENT_COLOR, tempBitboards);
                            if (upperLeftMoves & KING_MASK) {
                                attackerMask |= upperLeftMoves;
                                break;
                            }
                            // Ataca o rei na diagonal inferior direita
                            let lowerRightMoves = getLR(i, OPPONENT_COLOR, tempBitboards);
                            if (lowerRightMoves & KING_MASK) {
                                attackerMask |= lowerRightMoves;
                                break;
                            }
                            // Ataca o rei na diagonal inferior esquerda
                            let lowerLeftMoves = getLL(i, OPPONENT_COLOR, tempBitboards);
                            if (lowerLeftMoves & KING_MASK) {
                                attackerMask |= lowerLeftMoves;
                                break;
                            }
                        }
                        break;
                    case PAWN:
                        // Verifica se o peão ataca o rei
                        if (getCaptureLeft(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            attackerMask |= getCaptureLeft(i, OPPONENT_COLOR, tempBitboards);
                            break;
                        }
                        else if (getCaptureRight(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            attackerMask |= getCaptureRight(i, OPPONENT_COLOR, tempBitboards);
                            break;
                        }
                        break;
                    case KNIGHT:
                        // Verifica se o cavalo ataca o rei
                        if (getKnightMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            attackerMask |= (getKnightMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK);
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }

    let opponentPiece = null;
    // Obtem a posição do rei
    let kingPosition = 0;
    for (let i = 0; i < 64; i++) {
        if (KING_MASK & (1n << BigInt(i))) {
            kingPosition = i;
            break;
        }
    }
    // Obtem os movimentos possíveis do rei
    let kingMovesMask = getKingMoves(kingPosition, color, tempBitboards);
    // verifica se o rei pode capturar a peça que ataca ele, ou seja, se ela nao está protegida por outra peça
    if (kingMovesMask & attackerPositionMask) {
        // remove temporariamente o rei
        tempBitboards[color][KING] &= ~KING_MASK;
        // remove a peça que está atacando o rei
        for (let op = 0; op < 6; op++) {
            tempBitboards[OPPONENT_COLOR][op] &= ~attackerPositionMask;
            opponentPiece = op;
        }
        // adiciona o rei na posição capturada
        tempBitboards[color][KING] |= attackerPositionMask;
        // verifica se o rei está em xeque
        if (isKingInCheck(tempBitboards, color)) {
            // Restaura a peça que foi removida
            tempBitboards[OPPONENT_COLOR][opponentPiece] |= attackerPositionMask;
            // Restaura a posição do rei
            tempBitboards[color][KING] &= ~attackerPositionMask;
            tempBitboards[color][KING] |= KING_MASK;
            // remove o movimento possível 
            kingMovesMask &= ~attackerPositionMask;
        }
        else {
            // Restaura a peça que foi removida
            tempBitboards[OPPONENT_COLOR][opponentPiece] |= attackerPositionMask;
            // Restaura a posição do rei
            tempBitboards[color][KING] &= ~attackerPositionMask;
            tempBitboards[color][KING] |= KING_MASK;
            // Deixa o movimento possível para defender o rei no bitboard
        }
    }
    defenderMask |= kingMovesMask;

    // Se for atacado por mais de uma peça, somente o movimento de rei é possível	
    if (attackersCount > 1) {
        return kingMovesMask;
    }

    // Verificar se alguma peça aliada pode capturar ou entrar na frente de quem está atacando o rei
    for (let p = 0; p < 6; p++) {
        // Obtem o bitboard da peça
        let bitboard = tempBitboards[color][p];
        // Obter a posição das peças defensoras
        for (let i = 0; i < 64; i++) {
            // Verifica se existe uma peça na posição i
            if (bitboard & (1n << BigInt(i))) {
                // Escolhe o tipo da peça
                switch (p) {
                    case PAWN:
                        let pawnMoves = getPawnMoves(i, color, tempBitboards, enPassant);
                        if (pawnMoves & (attackerMask | attackerPositionMask)) {
                            // Remove temporariamente a peça que está atacando o rei
                            for (let op = 0; op < 6; op++) {
                                if (tempBitboards[OPPONENT_COLOR][op] & attackerPositionMask) {
                                    tempBitboards[OPPONENT_COLOR][op] &= ~attackerPositionMask;
                                    opponentPiece = op;
                                    break;
                                }
                            }
                            // Verifica se o peão está cravado após a remoção da peça atacante
                            let pinned = isPinnedMask(i, tempBitboards);
                            // Se não estiver cravada por outro ataque
                            if (!pinned) {
                                // Adiciona o movimento possível para defender o rei
                                defenderMask |= (pawnMoves & (attackerMask | attackerPositionMask));
                            }
                            // Restaura a peça que foi removida
                            tempBitboards[OPPONENT_COLOR][opponentPiece] |= attackerPositionMask;
                        }
                        break;
                    case ROOK:
                        let rookMoves = getRookMoves(i, color, tempBitboards);
                        if (rookMoves & (attackerMask | attackerPositionMask)) {
                            // Remove temporariamente a peça que está atacando o rei
                            for (let op = 0; op < 6; op++) {
                                if (tempBitboards[OPPONENT_COLOR][op] & attackerPositionMask) {
                                    tempBitboards[OPPONENT_COLOR][op] &= ~attackerPositionMask;
                                    opponentPiece = op;
                                    break;
                                }
                            }
                            // Verifica se o peão está cravado após a remoção da peça atacante
                            let pinned = isPinnedMask(i, tempBitboards);
                            // Se não estiver cravada por outro ataque
                            if (!pinned) {
                                // Adiciona o movimento possível para defender o rei
                                defenderMask |= (rookMoves & (attackerMask | attackerPositionMask));
                            }
                            // Restaura a peça que foi removida
                            tempBitboards[OPPONENT_COLOR][opponentPiece] |= attackerPositionMask;
                        }
                        break;
                    case KNIGHT:
                        let knightMoves = getKnightMoves(i, color, tempBitboards);
                        if (knightMoves & (attackerMask | attackerPositionMask)) {
                            // Remove temporariamente a peça que está atacando o rei
                            for (let op = 0; op < 6; op++) {
                                if (tempBitboards[OPPONENT_COLOR][op] & attackerPositionMask) {
                                    tempBitboards[OPPONENT_COLOR][op] &= ~attackerPositionMask;
                                    opponentPiece = op;
                                    break;
                                }
                            }
                            // Verifica se o peão está cravado após a remoção da peça atacante
                            let pinned = isPinnedMask(i, tempBitboards);
                            // Se não estiver cravada por outro ataque
                            if (!pinned) {
                                // Adiciona o movimento possível para defender o rei
                                defenderMask |= (knightMoves & (attackerMask | attackerPositionMask));
                            }
                            // Restaura a peça que foi removida
                            tempBitboards[OPPONENT_COLOR][opponentPiece] |= attackerPositionMask;
                        }
                        break;
                    case BISHOP:
                        let bishopMoves = getBishopMoves(i, color, tempBitboards);
                        if (bishopMoves & (attackerMask | attackerPositionMask)) {
                            // Remove temporariamente a peça que está atacando o rei
                            for (let op = 0; op < 6; op++) {
                                if (tempBitboards[OPPONENT_COLOR][op] & attackerPositionMask) {
                                    tempBitboards[OPPONENT_COLOR][op] &= ~attackerPositionMask;
                                    opponentPiece = op;
                                    break;
                                }
                            }
                            // Verifica se o peão está cravado após a remoção da peça atacante
                            let pinned = isPinnedMask(i, tempBitboards);
                            // Se não estiver cravada por outro ataque
                            if (!pinned) {
                                // Adiciona o movimento possível para defender o rei
                                defenderMask |= (bishopMoves & (attackerMask | attackerPositionMask));
                            }
                            // Restaura a peça que foi removida
                            tempBitboards[OPPONENT_COLOR][opponentPiece] |= attackerPositionMask;
                        }
                        break;
                    case QUEEN:
                        let queenMoves = getQueenMoves(i, color, tempBitboards);
                        if (queenMoves & (attackerMask | attackerPositionMask)) {
                            // Remove temporariamente a peça que está atacando o rei
                            for (let op = 0; op < 6; op++) {
                                if (tempBitboards[OPPONENT_COLOR][op] & attackerPositionMask) {
                                    tempBitboards[OPPONENT_COLOR][op] &= ~attackerPositionMask;
                                    opponentPiece = op;
                                    break;
                                }
                            }
                            // Verifica se o peão está cravado após a remoção da peça atacante
                            let pinned = isPinnedMask(i, tempBitboards);
                            // Se não estiver cravada por outro ataque
                            if (!pinned) {
                                // Adiciona o movimento possível para defender o rei
                                defenderMask |= (bishopMoves & (attackerMask | attackerPositionMask));
                            }
                            // Restaura a peça que foi removida
                            tempBitboards[OPPONENT_COLOR][opponentPiece] |= attackerPositionMask;
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }
    // console.log("Defender Mask:");
    // console.log(defenderMask.toString(2).padStart(64, "0").match(/.{8}/g).join("\n"));
    return defenderMask;
}

function restart() {
    // Reseta as variáveis 
    availableMoves = 0n;
    selectedPiece = null;
    selectedColor = null;
    fromPosition = null;
    toPosition = null;
    enPassant = null;
    currentTurn = WHITE;
    currentFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    halfMoves = 0;
    fullMoves = 1;
    checkMask = 0n;
    availableCastlingMask = WHITE_ROOK_KINGSIDE | WHITE_ROOK_QUEENSIDE | BLACK_ROOK_KINGSIDE | BLACK_ROOK_QUEENSIDE;
    initializeBoard();
    renderBoard();
}