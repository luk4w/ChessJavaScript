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
import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, PIECES_STRING, PIECES_SAN } from './constants/pieces.js';
import { WHITE, BLACK } from './constants/colors.js';
import {
    WHITE_ROOK_KINGSIDE, WHITE_ROOK_QUEENSIDE, BLACK_ROOK_KINGSIDE, BLACK_ROOK_QUEENSIDE,
    WHITE_KINGSIDE_CASTLING_EMPTY, WHITE_QUEENSIDE_CASTLING_EMPTY, BLACK_KINGSIDE_CASTLING_EMPTY, BLACK_QUEENSIDE_CASTLING_EMPTY
} from './constants/castling.js';
import { CAPTURE_SOUND, CASTLING_SOUND, CHECK_SOUND, END_SOUND, FAILURE_SOUND, MOVE_SOUND } from './constants/sounds.js';
import { NOT_1_RANK, NOT_8_RANK } from './constants/edges.js';

// Importação das funções
import { getPawnMoves, getPawnAttackerMask } from './pawn.js';
import { getRookMoves, getR, getL, getU, getD } from './rook.js';
import { getKnightMoves } from './knight.js';
import { getBishopMoves, getUR, getUL, getLL, getLR } from './bishop.js';
import { getQueenMoves } from './queen.js';
import { getKingMoves } from './king.js';

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
let currentFEN = ""; // FEN atual
let halfMoves = 0; // Contagem de 100 movimentos sem captura ou movimento de peão (meio movimento)
let fullMoves = 1; // Número total de movimentos completos
let kingCheckMask = 0n; // Máscara do rei em xeque
let availableCastlingMask = WHITE_ROOK_KINGSIDE | WHITE_ROOK_QUEENSIDE | BLACK_ROOK_KINGSIDE | BLACK_ROOK_QUEENSIDE; // Máscara para os roques disponíveis
let isPromotion = false; // Verifica se está ocorrendo uma promoção de peão
let isMate = false; // Verificar se houve xeque mate

// Informações do jogo
let game = {
    event: "",
    site: "",
    date: "",
    round: "",
    white: "",
    black: "",
    result: "",
    moves: []
};

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
    @COMPORTAMENTO_DE_MEMORIA_PARA_O_MOVIMENTO_DA_PEÇA

    @REMOVER_PEÇA
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

    @ADICIONAR_PEÇA
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
    const OPPONENT_PIECES = bitboards[OPPONENT_COLOR][PAWN] | bitboards[OPPONENT_COLOR][KNIGHT] | bitboards[OPPONENT_COLOR][BISHOP]
        | bitboards[OPPONENT_COLOR][ROOK] | bitboards[OPPONENT_COLOR][QUEEN] | bitboards[OPPONENT_COLOR][KING];
    // Mascara de bits da nova posição
    const TO_MASK = 1n << BigInt(toPosition);
    // Verificar se algum som ja foi tocado
    let isPlayedSound = false;
    // Verificar se houve captura de peça
    let isCapture = false;

    if (availableMoves & TO_MASK) {
        // Incrementa os meios movimentos
        halfMoves++;
        // Remove a posição de origem da peça
        bitboards[selectedColor][selectedPiece] &= ~(1n << BigInt(fromPosition));
        // Adiciona a nova posição da peça
        bitboards[selectedColor][selectedPiece] |= TO_MASK;
        // Verifica se houve captura de peça
        if (TO_MASK & OPPONENT_PIECES) {
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
            isPlayedSound = true;
            isCapture = true;
            enPassant = null;
            halfMoves = 0;
        }

        switch (selectedPiece) {
            case PAWN:
                // Verifica se o peão chegou ao final do tabuleiro
                if (TO_MASK & ~NOT_8_RANK || TO_MASK & ~NOT_1_RANK) {
                    // Informa que está ocorrendo uma promoção de peão
                    isPromotion = true;
                    promotionPawn(fromPosition, toPosition, selectedColor, bitboards);
                    return;
                }
                // Obtem os peões adversários
                const OPPONENT_PAWNS = selectedColor === WHITE ? bitboards[BLACK][PAWN] : bitboards[WHITE][PAWN];
                const CAPTURE_LEFT = selectedColor === WHITE ? fromPosition + 9 : fromPosition - 9;
                const CAPTURE_RIGHT = selectedColor === WHITE ? fromPosition + 7 : fromPosition - 7;
                // Verifica se o peão foi capturado pelo movimento en passant
                if ((enPassant !== null) && (toPosition === CAPTURE_LEFT || toPosition === CAPTURE_RIGHT)
                    && (OPPONENT_PAWNS & (1n << BigInt(enPassant)))) {
                    // remove o peão capturado
                    bitboards[OPPONENT_COLOR][PAWN] &= ~(1n << BigInt(enPassant));
                    isPlayedSound = true;
                    isCapture = true;
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
                    // Efeito sonoro de roque
                    CASTLING_SOUND.play();
                    isPlayedSound = true;
                    // Adicionar torre na posição do roque curto
                    if (toPosition === fromPosition - 2) {
                        // Roque do lado do rei
                        bitboards[selectedColor][ROOK] &= ~(1n << BigInt(fromPosition - 3));
                        bitboards[selectedColor][ROOK] |= 1n << BigInt(fromPosition - 1);
                    }
                    // Adicionar torre na posição do roque longo
                    else if (toPosition === fromPosition + 2) {
                        // Roque do lado da rainha
                        bitboards[selectedColor][ROOK] &= ~(1n << BigInt(fromPosition + 4));
                        bitboards[selectedColor][ROOK] |= 1n << BigInt(fromPosition + 1);
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
        let opponentKingCheck = isKingInCheck(bitboards, OPPONENT_COLOR);
        if (opponentKingCheck) {
            kingCheckMask = opponentKingCheck; // Marca o rei adversário
            // verifica se o rei adversário está em xeque mate
            if (getDefenderMovesMask(bitboards, OPPONENT_COLOR) === 0n) {
                isMate = true;
                showCheckmate();
            }
            else {
                // Efeito sonoro de xeque
                CHECK_SOUND.play();
                isPlayedSound = true;
            }
        }
        // Verifica o empate por afogamento
        else if (getMovesMask(OPPONENT_COLOR, bitboards) === 0n) {
            showDraw();
        }
        else {
            // Desmarca o rei em xeque
            kingCheckMask = 0n;
        }
        if (isCapture) {
            // Efeito sonoro de captura
            CAPTURE_SOUND.play();
        }
        else if (!isPlayedSound) {
            // Efeito sonoro de movimento
            MOVE_SOUND.play();
        }
        // Contagem das jogadas completas
        if (currentTurn === BLACK) {
            fullMoves++;
        }
        // Atualiza o turno
        currentTurn = currentTurn === WHITE ? BLACK : WHITE;
        // Atualiza a FEN no layout
        updateFEN();
        // Registra o movimento em notação algébrica
        const isCheck = kingCheckMask !== 0n;
        game.moves.push(getSanMove(fromPosition, toPosition, selectedPiece, isCapture, null, isCheck, isMate));
        // Atualiza o PGN no layout
        updatePGN();

    } else {
        // Efeito sonoro de movimento inválido
        FAILURE_SOUND.play();
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
            if (kingCheckMask === 1n << BigInt(index)) {
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
            square.addEventListener("click", handleOnMoveClick); // adiciona o evento de clique esquerdo
            square.addEventListener('contextmenu', handleRightClick); // adiciona o evento de clique direito
            row.appendChild(square); // adiciona a quadrado na linha
        }
        boardElement.appendChild(row); // adiciona a linha ao tabuleiro
    }

    // Atualização das peças no tabuleiro
    updatePiecesOnBoard();
}

// Evento de clique com o botão direito do mouse
function handleRightClick(event) {
    event.preventDefault(); // Previne a abertura do menu de contexto padrão do navegador
    // Alterna a classe de pré-visualização
    event.currentTarget.classList.toggle('preview');
    // DEBUG
    // console.log(event.currentTarget.dataset.index);
}

function promotionPawn(fromPosition, toPosition, color) {
    const boardElement = document.getElementById("chessboard");
    const squares = boardElement.getElementsByTagName("td");

    // Remove os efeitos visuais e adiciona esmaecimento a todos os quadrados
    for (let square of squares) {
        square.classList.remove("available", "selected");
        square.classList.add("dimmed");
        square.removeEventListener("click", handleOnMoveClick);
        // Adiciona o evento de clique a todos os quadrados
        square.addEventListener("click", handlePromotionClick);
    }

    // Determina as posições das peças que aparecerão para a promoção (em relação ao bitboard)
    const promotionPositions = color === WHITE ? [toPosition, toPosition - 8, toPosition - 16, toPosition - 24]
        : [toPosition, toPosition + 8, toPosition + 16, toPosition + 24];

    // Evento de clique para a promoção
    function handlePromotionClick(event) {
        // Obtem a mascara da posição de destino
        const TO_MASK = 1n << BigInt(toPosition);
        // Obtém a peça selecionada para a promoção
        const index = parseInt(event.currentTarget.dataset.index);
        // Verifica se a peça selecionada está entre as posições de promoção
        if (promotionPositions.includes(index)) {
            // Verificar se houve captura de peça
            let isCapture = false;
            // Obtém a peça de promoção
            let promotionPiece = getPromotionPiece(index);
            // Efeito sonoro de promoção
            MOVE_SOUND.play();
            // Remove o peão
            bitboards[color][PAWN] &= ~TO_MASK;
            // Adiciona a peça promovida
            bitboards[color][promotionPiece] |= TO_MASK;
            // Cor da peça adversária
            const OPPONENT_COLOR = color === WHITE ? BLACK : WHITE;
            // Bitboards das peças adversárias
            const OPPONENT_PIECES = bitboards[OPPONENT_COLOR][PAWN] | bitboards[OPPONENT_COLOR][KNIGHT] | bitboards[OPPONENT_COLOR][BISHOP]
                | bitboards[OPPONENT_COLOR][ROOK] | bitboards[OPPONENT_COLOR][QUEEN] | bitboards[OPPONENT_COLOR][KING];
            // Verifica se houve captura de peça
            if (TO_MASK & OPPONENT_PIECES) {
                isCapture = true;
            }
            // Verifica se o rei adversário está em xeque
            let opponentKingCheck = isKingInCheck(bitboards, OPPONENT_COLOR);
            if (opponentKingCheck) {
                kingCheckMask = opponentKingCheck; // Marca o rei adversário
                // verifica se o rei adversário está em xeque mate
                if (getDefenderMovesMask(bitboards, OPPONENT_COLOR) === 0n) {
                    isMate = true;
                    showCheckmate();
                }
                else {
                    // Efeito sonoro de xeque
                    CHECK_SOUND.play();
                }
            }
            // Verifica o empate por afogamento
            else if (getMovesMask(OPPONENT_COLOR, bitboards) === 0n) {
                showDraw();
            }
            else {
                // Desmarca o rei em xeque
                kingCheckMask = 0n;
            }
            if (isCapture) {
                // Efeito sonoro de captura
                CAPTURE_SOUND.play();
            }
            else {
                MOVE_SOUND.play();
            }
            // Contagem das jogadas completas
            if (currentTurn === BLACK) {
                fullMoves++;
            }
            // Atualiza o turno
            currentTurn = currentTurn === WHITE ? BLACK : WHITE;
            // Atualiza a FEN no layout
            updateFEN();
            // Registra o movimento em notação algébrica
            const isCheck = kingCheckMask !== 0n;
            game.moves.push(getSanMove(fromPosition, toPosition, selectedPiece, isCapture, promotionPiece, isCheck, isMate));
            // Atualiza o PGN no layout
            updatePGN();
            // Atualiza o tabuleiro com a peça promovida
            renderBoard();
            isPromotion = false;
        }
        else {
            // Restaura o peão
            bitboards[color][PAWN] |= 1n << BigInt(fromPosition);
            // Remove o peão da nova posição
            bitboards[color][PAWN] &= ~TO_MASK;
            // Atualiza o tabuleiro com a peça promovida
            renderBoard();
            isPromotion = false;
        }
    }

    // Adiciona as peças de promoção e destaca os quadrados
    for (let i in promotionPositions) {
        // Obtém o índice do quadrado
        const indexHTML = 63 - promotionPositions[i];
        // Obtém o quadrado
        const square = squares[indexHTML];
        // Adiciona a peça ao tabuleiro
        addPieceToBoard(promotionPositions[i], getPromotionPiece(indexHTML), color);
        // Remove o efeito de esmaecimento
        square.classList.remove("dimmed");
        // Adiciona o efeito de promoção
        square.classList.add("promotion");
        // Define o índice para identificar qual quadrado foi clicado
        square.dataset.index = promotionPositions[i];
    }
}

function showCheckmate() {
    // Efeito sonoro de xeque mate
    END_SOUND.play();
    // PGN
    game.result = selectedColor === WHITE ? "1-0" : "0-1";
    // Indica o vencedor
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

function showDraw() {
    // Efeito sonoro de empate
    END_SOUND.play();
    // PGN
    game.result = "1/2-1/2";
    // Atualiza a mensagem de empate
    document.getElementById("end-game-message").textContent = "Draw!\nStalemate.";
    // Exibe a mensagem de empate
    document.getElementById("end").style.display = "flex";
    // callback do botão restart
    document.getElementById("restart-button").addEventListener("click", function () {
        // Oculta a mensagem de empate
        document.getElementById("end").style.display = "none";
        // Reinicia o jogo
        restart();
    });

}

function getPromotionPiece(index) {
    let rank = Math.floor(index / 8);
    switch (rank) {
        case 0:
        case 7:
            return QUEEN;
        case 1:
        case 6:
            return KNIGHT;
        case 2:
        case 5:
            return ROOK;
        case 3:
        case 4:
            return BISHOP;
        default:
            return null;
    }
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
                        let allDefenderMoves = getDefenderMovesMask(bitboards, color);
                        // Verifica se a peça pode se mover para defender o rei
                        if (getPieceMovesMask(fromPosition, selectedPiece, selectedColor, bitboards) & allDefenderMoves) {
                            availableMoves = getPieceMovesMask(fromPosition, selectedPiece, selectedColor, bitboards) & allDefenderMoves;
                        }
                        break;
                    }
                    // Verifica se a peça está cravada e pode se mover
                    else if (isPinnedMask(fromPosition, bitboards) != null && isPinnedMask(fromPosition, bitboards) && selectedPiece !== KING) {
                        availableMoves = isPinnedMask(fromPosition, bitboards);
                        break;
                    }
                    // Verifica se a peça está cravada e não pode se mover
                    else if (isPinnedMask(fromPosition, bitboards) != null && !(isPinnedMask(fromPosition, bitboards)) && selectedPiece !== KING) {
                        availableMoves = 0n;
                        break;
                    }
                    availableMoves = getPieceMovesMask(fromPosition, selectedPiece, selectedColor, bitboards);
                    // Verifica se a mascara de roque está disponível
                    if (availableCastlingMask !== 0n && selectedPiece === KING) {
                        availableMoves |= getCastlingMovesMask(currentTurn, bitboards);
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
            // Refaz a seleção da peça
            onMove(toPosition);
            return;
        } else {
            // Verifica se o movimento não é ilegal
            if (!isIllegalMove()) {
                // Movimenta a peça
                movePiece();
            }
            else {
                // Efeito sonoro de movimento inválido
                FAILURE_SOUND.play();
            }
        }
        // Atualiza as variáveis para o próximo movimento
        fromPosition = null;
        selectedColor = null;
        toPosition = null;
        availableMoves = 0n;
    }
    // Se não estiver ocorrendo uma promoção de peão
    if (!isPromotion) {
        renderBoard(); // Renderiza o tabuleiro
    }
}

// Função para lidar com o clique no quadrado da tabela
function handleOnMoveClick(event) {
    // Obtem o indice do quadrado clicado
    const index = parseInt(event.currentTarget.dataset.index);
    // Verificações que antecedem o movimento
    onMove(index);
}

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
 * Obtem a máscara de bits de TODOS os movimentos possíveis
 * @param {Integer} color 
 * @param {Array<Array<BigInt>>} bitboards
 * @returns 
 */
function getMovesMask(color, bitboards) {
    let allMoves = 0n;
    // Iteração das peças
    for (let piece = 0; piece < 6; piece++) {
        let bitboard = bitboards[color][piece];
        // Iteração das posições presentes em cada bitboard
        for (let i = 0; i < 64; i++) {
            // Verifica se existe uma peça na posição i
            if (bitboard & (1n << BigInt(i))) {
                // Adiciona os movimentos possíveis da peça a todos os movimentos
                allMoves |= getPieceMovesMask(i, piece, color, bitboards);
            }
        }
    }
    return allMoves;
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
    // Mascara de bits do rei
    const KING_MASK = tempBitboards[color][KING];
    // Cor da peça adversária
    const OPPONENT_COLOR = color === WHITE ? BLACK : WHITE;
    // remove a peça da posição de origem
    tempBitboards[color][piece] &= ~(1n << BigInt(fromPosition));
    // Mascara de bits do ataque (posição da peça e quadrados atacados)
    let attackerMask = 0n;
    // Mascara de bits dos movimentos inimigos
    const ENEMY_MOVES = getMovesMask(OPPONENT_COLOR, tempBitboards);
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


/**
 * Verifica se o rei está em xeque
 * @param {Array<Array<BigInt>>} bitboards
 * @param {Integer} color 
 * @returns mascara de bits do rei em xeque ou 0n se não estiver em xeque
 */
function isKingInCheck(bitboards, color) {
    const OPPONENT_COLOR = color === WHITE ? BLACK : WHITE;
    if (bitboards[color][KING] & getAttackerMask(OPPONENT_COLOR, bitboards)) {
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
 * @returns {BigInt} Mascara dos movimentos da peça
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
            moves |= getKingSafeMoves(from, color, bitboards);
            break;
        default:
            throw new Error("Piece not found!");
    }
    return moves;
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
 * Obtem os movimentos seguros para o rei, considerando possíveis ataques adversários
 * @param {Integer} from
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt} Mascara dos movimentos seguros do rei
 */
function getKingSafeMoves(from, color, bitboards) {
    // Movimentos possíveis do rei
    let movesMask = 0n;
    // Constantes
    const OPPONENT_COLOR = color === WHITE ? BLACK : WHITE;
    const OPPONENT_PIECES = bitboards[OPPONENT_COLOR][PAWN] | bitboards[OPPONENT_COLOR][KNIGHT] | bitboards[OPPONENT_COLOR][BISHOP]
        | bitboards[OPPONENT_COLOR][ROOK] | bitboards[OPPONENT_COLOR][QUEEN] | bitboards[OPPONENT_COLOR][KING];
    let kingMovesMask = getKingMoves(from, color, bitboards);
    // copia o estado atual das peças
    let tempBitboards = [
        bitboards[WHITE].map(bitboard => BigInt(bitboard)),
        bitboards[BLACK].map(bitboard => BigInt(bitboard))
    ];
    // Remove o rei da posição de origem
    tempBitboards[color][KING] &= ~(1n << BigInt(from))
    // Obtem a mascara de todos os ataques possíveis
    const ATTACKER_MASK = getAttackerMask(OPPONENT_COLOR, tempBitboards);
    // Adiciona o rei novamente na posição de origem
    tempBitboards[color][KING] |= 1n << BigInt(from);
    // Remove os movimentos que o rei não pode realizar
    movesMask = (kingMovesMask & ~ATTACKER_MASK);
    // Verifica se o rei pode capturar alguma peça adversária
    if (movesMask & OPPONENT_PIECES) {
        // Itera sobre todas as peças adversárias
        for (let p = 0; p < 6; p++) {
            // Verifica se o movimento do rei coincide com a posição de alguma das peças adversárias
            if (bitboards[OPPONENT_COLOR][p] & movesMask) {
                // Itera sobre o bitboard
                for (let i = 0; i < 64; i++) {
                    // Verifica se a peça coincide com o movimento do rei
                    if (movesMask & 1n << BigInt(i) && bitboards[OPPONENT_COLOR][p] & 1n << BigInt(i)) {
                        // Remove a peça do adversário
                        tempBitboards[OPPONENT_COLOR][p] &= ~(1n << BigInt(i));
                        // Remove o rei da posição de origem
                        tempBitboards[color][KING] &= ~(1n << BigInt(from));
                        // Adiciona o rei na nova posição
                        tempBitboards[color][KING] |= 1n << BigInt(i);
                        // verifica se o rei está em xeque após a captura
                        if (isKingInCheck(tempBitboards, color)) {
                            // remove o movimento de captura SE o rei estiver em xeque
                            movesMask &= ~(1n << BigInt(i));
                        }
                        // Remove o rei da nova posição
                        tempBitboards[color][KING] &= ~(1n << BigInt(i));
                        // Adiciona o rei na posição de origem
                        tempBitboards[color][KING] |= 1n << BigInt(from);
                        // Adiciona a peça do adversário
                        tempBitboards[OPPONENT_COLOR][p] |= 1n << BigInt(i);
                    }
                }
            }
        }
    }
    return movesMask;
}

/**
 * Obtem a mascara de todos os ataques possiveis
 * @param {Integer} color
 * @param {Array<Array<BigInt>>} bitboards
 * @returns {BigInt} 
 */
function getAttackerMask(color, bitboards) {
    let attackerMask = 0n;
    for (let op = 0; op < 6; op++) {
        for (let i = 0; i < 64; i++) {
            if (bitboards[color][op] & (1n << BigInt(i))) {
                switch (op) {
                    case PAWN:
                        attackerMask |= getPawnAttackerMask(i, color);
                        break;
                    case ROOK:
                        attackerMask |= getRookMoves(i, color, bitboards);
                        break;
                    case KNIGHT:
                        attackerMask |= getKnightMoves(i, color, bitboards);
                        break;
                    case BISHOP:
                        attackerMask |= getBishopMoves(i, color, bitboards);
                        break;
                    case QUEEN:
                        attackerMask |= getQueenMoves(i, color, bitboards);
                        break;
                    case KING:
                        attackerMask |= getKingMoves(i, color, bitboards);
                        break;
                }
            }
        }
    }
    return attackerMask;
}

/**
 * Obtem todos os movimentos possíveis para a defesa do rei
 * @param {Array<Array<BigInt>>} bitboards
 * @param {Integer} color 
 * @returns mascara de bits dos movimentos possíveis de defesa
 */
function getDefenderMovesMask(bitboards, color) {

    // Copia o estado atual das peças
    let tempBitboards = [
        bitboards[WHITE].map(bitboard => BigInt(bitboard)), // Copia o array de peças brancas
        bitboards[BLACK].map(bitboard => BigInt(bitboard))  // Copia o array de peças pretas
    ];
    const KING_MASK = bitboards[color][KING];
    const OPPONENT_COLOR = color === WHITE ? BLACK : WHITE;
    // Mascara de bits dos ataques ao rei
    let attackerMask = 0n;
    // Posição das peças atacantes
    let attackerPositionMask = 0n;
    // Contador de peças atacantes
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
                        if (getPawnAttackerMask(i, OPPONENT_COLOR) & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            attackerMask |= (getPawnAttackerMask(i, OPPONENT_COLOR));
                        }
                        break;
                    case KNIGHT:
                        // Verifica se o cavalo ataca o rei
                        if (getKnightMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            attackerMask |= (getKnightMoves(i, OPPONENT_COLOR, tempBitboards));
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }

    // Posicao do rei
    let kingPosition = 0;
    // Obtem a posição do rei
    for (let i = 0; i < 64; i++) {
        if (KING_MASK & (1n << BigInt(i))) {
            kingPosition = i;
            break;
        }
    }
    // Mascara de bits dos movimentos de defesa
    let defenderMask = 0n;
    // Obtem os movimentos possíveis do rei
    let kingMovesMask = getKingSafeMoves(kingPosition, color, tempBitboards);

    // adiciona os movimentos do rei na mascara de defesa
    defenderMask |= kingMovesMask;

    // Peça que está atacando o rei
    let opponentPiece = null;

    // Se for atacado por mais de uma peça, somente o movimento de rei é possível	
    if (attackersCount > 1) {
        // console.log("attackerCOunt > 1  === " + attackersCount);
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
                                defenderMask |= (queenMoves & (attackerMask | attackerPositionMask));
                            }
                            // Restaura a peça que foi removida
                            tempBitboards[OPPONENT_COLOR][opponentPiece] |= attackerPositionMask;
                        }
                        break;
                    default:
                        break;
                }

                // console.log("Defender Mask:" + i);
                // console.log(defenderMask.toString(2).padStart(64, "0").match(/.{8}/g).join("\n"));

            }
        }
    }

    return defenderMask;
}

function getCastlingMovesMask(color, bitboards) {
    // Mascara de bits dos movimentos de roque
    let castlingMoves = 0n;
    // Mascara de bits de todas as peças do tabuleiro
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK]
        | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK]
        | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const ALL_PIECES = BLACK_PIECES | WHITE_PIECES;
    // Verifica se o rei está em xeque
    if (isKingInCheck(bitboards, color)) return 0n;
    // Verifica a cor das peças
    if (color === WHITE) {
        // Verifica a torre da ala do rei
        if (availableCastlingMask & WHITE_ROOK_KINGSIDE) {
            // Verifica se as casas entre o rei e a torre estão vazias
            if (!(WHITE_KINGSIDE_CASTLING_EMPTY & ALL_PIECES)) {
                // Verifica se o rei pode ir para a posição F1 
                if (getKingSafeMoves(3, WHITE, bitboards) & 1n << BigInt(2)) {
                    // verifica se pode ir para posição final G1 (da posição F1)
                    if (getKingSafeMoves(2, WHITE, bitboards) & 1n << BigInt(1)) {
                        // Adiciona o roque curto na mascara de movimentos
                        castlingMoves |= 1n << BigInt(1);
                    }
                }
            }
        }
        // Verifica a torre da ala da dama
        if (availableCastlingMask & WHITE_ROOK_QUEENSIDE) {
            // Verifica se as casas entre o rei e a torre estão vazias
            if (!(WHITE_QUEENSIDE_CASTLING_EMPTY & ALL_PIECES)) {
                // Verifica se o rei pode ir para a posição D1
                if (getKingSafeMoves(3, WHITE, bitboards) & 1n << BigInt(4)) {
                    // verifica se pode ir para posição final C1 (da posição D1)
                    if (getKingSafeMoves(4, WHITE, bitboards) & 1n << BigInt(5)) {
                        // Adiciona o roque grande na mascara de movimentos
                        castlingMoves |= 1n << BigInt(5);
                    }
                }
            }
        }
    } else { // color === BLACK
        // Verifica a torre da ala do rei
        if (availableCastlingMask & BLACK_ROOK_KINGSIDE) {
            // Verifica se as casas entre o rei e a torre estão vazias
            if (!(BLACK_KINGSIDE_CASTLING_EMPTY & ALL_PIECES)) {
                // Verifica se o rei pode ir para a posição F8
                if (getKingSafeMoves(59, BLACK, bitboards) & 1n << BigInt(58)) {
                    // verifica se pode ir para posição final G8 (da posição F8)
                    if (getKingSafeMoves(58, BLACK, bitboards) & 1n << BigInt(57)) {
                        // Adiciona o roque curto na mascara de movimentos
                        castlingMoves |= 1n << BigInt(57);
                    }
                }
            }
        }
        // Verifica a torre da ala da dama
        if (availableCastlingMask & BLACK_ROOK_QUEENSIDE) {
            // Verifica se as casas entre o rei e a torre estão vazias
            if (!(BLACK_QUEENSIDE_CASTLING_EMPTY & ALL_PIECES)) {
                // Verifica se o rei pode ir para a posição D8
                if (getKingSafeMoves(59, BLACK, bitboards) & 1n << BigInt(60)) {
                    // verifica se pode ir para posição final C8 (da posição D8)
                    if (getKingSafeMoves(60, BLACK, bitboards) & 1n << BigInt(61)) {
                        // Adiciona o roque grande na mascara de movimentos
                        castlingMoves |= 1n << BigInt(61);
                    }
                }
            }
        }
    }
    return castlingMoves;
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
    kingCheckMask = 0n;
    availableCastlingMask = WHITE_ROOK_KINGSIDE | WHITE_ROOK_QUEENSIDE | BLACK_ROOK_KINGSIDE | BLACK_ROOK_QUEENSIDE;;
    initialize();
    updateFEN();
    updatePGN();
}

// Portable Game Notation
function generatePGN(game) {
    let pgn = "";
    // Metadados da partida
    pgn += `[Event "${game.event}"]\n`;
    pgn += `[Site "${game.site}"]\n`;
    pgn += `[Date "${game.date}"]\n`;
    pgn += `[Round "${game.round}"]\n`;
    pgn += `[White "${game.white}"]\n`;
    pgn += `[Black "${game.black}"]\n`;
    pgn += `[Result "${game.result}"]\n\n`;
    // Movimentos da partida
    for (let i = 0; i < game.moves.length; i++) {
        if (i % 2 === 0) {
            pgn += `${Math.floor(i / 2) + 1}. `;
        }
        pgn += `${game.moves[i]} `;
    }
    return pgn;
}

function getSanMove(from, to, pieceType, isCapture, promotionPiece, isCheck, isCheckmate) {
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

function updatePGN() {
    let pgn = generatePGN(game);
    let textarea = document.getElementById("pgn");
    textarea.value = pgn;
    textarea.scrollTop = textarea.scrollHeight; // Rola para o final do textarea
}

function initialize() {
    // Informações da partida
    game = {
        event: "",
        site: "Chess Java Script",
        date: new Date().toLocaleDateString().replace(/\//g, "-"),
        round: "1",
        white: "Player 1",
        black: "Player 2",
        result: "*",
        moves: [],
        fen: ""
    };
    // Insere os dados dos bitboards
    initializeBoard();
    // Renderiza o tabuleiro
    renderBoard();
}

// Inicializa o jogo
initialize();