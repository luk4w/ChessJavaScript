/**
    @Autor Lucas Franco de Mello
    @Description Implementação de um jogo de xadrez com bitboards em JavaScript
    @Date 2024-06-27
*/

// Importação das constantes
import { PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, PIECES_STRING, PIECES_SAN } from './constants/pieces.js';
import { WHITE, BLACK } from './constants/colors.js';
import {
    WHITE_ROOK_KINGSIDE, WHITE_ROOK_QUEENSIDE, BLACK_ROOK_KINGSIDE, BLACK_ROOK_QUEENSIDE,
    WHITE_KINGSIDE_CASTLING_EMPTY, WHITE_QUEENSIDE_CASTLING_EMPTY, BLACK_KINGSIDE_CASTLING_EMPTY, BLACK_QUEENSIDE_CASTLING_EMPTY
} from './constants/castling.js';
import { CAPTURE_SOUND, CASTLING_SOUND, CHECK_SOUND, END_SOUND, FAILURE_SOUND, MOVE_SOUND } from './constants/sounds.js';
import { RANK_1, RANK_8, FILES_MASK, RANKS_MASK } from './constants/masks.js';

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
// Estado do jogo
let gameState = {
    // Tabuleiro da partida
    bitboards: [
        new Array(6).fill(0n), // 6 tipos de peças brancas
        new Array(6).fill(0n)  // 6 tipos de peças pretas
    ],
    availableMoves: 0n, // Movimentos disponíveis
    selectedPiece: null, // Peça selecionada
    selectedColor: null, // Cor selecionada
    fromPosition: null, // Posição de origem da peça
    toPosition: null, // Posição de destino da peça
    enPassant: null, // Posição do peão que pode ser capturado com en passant
    turn: WHITE, // Turno atual
    fen: "", // FEN atual
    halfMoves: 0, // Contagem de 100 movimentos sem captura ou movimento de peão (meio movimento)
    fullMoves: 1, // Número total de movimentos completos
    kingCheckMask: 0n, // Máscara do rei em xeque
    availableCastlingMask: 0n, // Máscara para os roques disponíveis
    isPromotion: false, // Verifica se está ocorrendo uma promoção de peão
    isMate: false, // Verificar se houve xeque mate
    metadata: { // Metadados do jogo
        event: "", // Evento
        site: "", // Local
        date: "", // Data
        round: "", // Rodada
        white: "", // Jogador com as peças brancas
        black: "", // Jogador com as peças pretas
        result: "", // Resultado
        moves: []  // Lista de movimentos
    },
    invalidMove: "", // Registro do último movimento inválido
    lastMoveMask: 0n // Mascara do ultimo movimento realizado (fromPosition e toPosition)
};
let isImportPGN = false; // Verifica se o PGN foi importado
let isEngineTurn = true; // Verifica se o Stockfish está jogando
let playAgainstStockfish = true; // Jogar contra o Stockfish

// Inicializa o tabuleiro de xadrez com as posições iniciais das peças.
function initializeBoard(bitboards) {
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

// Inicializa o Stockfish
var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
var stockfish = new Worker(wasmSupported ? './stockfish/stockfish.wasm.js' : './stockfish/stockfish.js');
stockfish.addEventListener('message', function (e) {
    if (event.data.startsWith('bestmove')) {
        isEngineTurn = true;
        const bestMove = event.data.split(' ')[1];
        setTimeout(() => {
            // Executa o melhor movimento do Stockfish
            executeStockfishMove(bestMove);
            // Atualiza as variáveis para o próximo movimento
            gameState.fromPosition = null;
            gameState.selectedColor = null;
            gameState.toPosition = null;
            gameState.availableMoves = 0n;
            // Atualiza o tabuleiro
            renderBoard(gameState);
        }, 500);
        isEngineTurn = false;
    }
});

function executeStockfishMove(bestMove) {
    gameState.selectedPiece = getPieceFromFEN(gameState.fen, bestMove);
    gameState.selectedColor = gameState.turn;
    testMove(bestMove, gameState);
}

// Move a peça
function movePiece(gameState) {
    // Cor da peça adversária
    const OPPONENT_COLOR = gameState.selectedColor === WHITE ? BLACK : WHITE;
    // Bitboards das peças adversárias
    const OPPONENT_PIECES = gameState.bitboards[OPPONENT_COLOR][PAWN] | gameState.bitboards[OPPONENT_COLOR][KNIGHT] | gameState.bitboards[OPPONENT_COLOR][BISHOP]
        | gameState.bitboards[OPPONENT_COLOR][ROOK] | gameState.bitboards[OPPONENT_COLOR][QUEEN] | gameState.bitboards[OPPONENT_COLOR][KING];
    // Mascara de bits da nova posição
    const TO_MASK = 1n << BigInt(gameState.toPosition);
    // Verificar se algum som ja foi tocado
    let isPlayedSound = false;
    // Verificar se houve captura de peça
    let isCapture = false;
    // Verifica se o movimento é válido
    if (gameState.availableMoves & TO_MASK) {
        // Incrementa os meios movimentos
        gameState.halfMoves++;
        // Remove a posição de origem da peça
        gameState.bitboards[gameState.selectedColor][gameState.selectedPiece] &= ~(1n << BigInt(gameState.fromPosition));
        // Adiciona a nova posição da peça
        gameState.bitboards[gameState.selectedColor][gameState.selectedPiece] |= TO_MASK;

        // Peças específicas
        switch (gameState.selectedPiece) {
            case PAWN:
                // Verifica se o peão chegou ao final do tabuleiro
                if (TO_MASK & RANK_8 || TO_MASK & RANK_1) {
                    // Informa que está ocorrendo uma promoção de peão
                    gameState.isPromotion = true;
                    promotionPawn(gameState);
                    return;
                }
                // Obtem os peões adversários
                const OPPONENT_PAWNS = gameState.selectedColor === WHITE ? gameState.bitboards[BLACK][PAWN] : gameState.bitboards[WHITE][PAWN];
                const CAPTURE_LEFT = gameState.selectedColor === WHITE ? gameState.fromPosition + 9 : gameState.fromPosition - 9;
                const CAPTURE_RIGHT = gameState.selectedColor === WHITE ? gameState.fromPosition + 7 : gameState.fromPosition - 7;
                // Verifica se o peão foi capturado pelo movimento en passant
                if ((gameState.enPassant !== null) && (gameState.toPosition === CAPTURE_LEFT || gameState.toPosition === CAPTURE_RIGHT)
                    && (OPPONENT_PAWNS & (1n << BigInt(gameState.enPassant)))) {
                    // remove o peão capturado
                    gameState.bitboards[OPPONENT_COLOR][PAWN] &= ~(1n << BigInt(gameState.enPassant));
                    isPlayedSound = true;
                    isCapture = true;
                }
                // Verifica se o peão avançou duas casas em seu primeiro movimento
                if (Math.abs(gameState.fromPosition - gameState.toPosition) === 16) {
                    // Verifica se existe um peão adversário do lado esquerdo ou direito
                    if ((OPPONENT_PAWNS & (1n << BigInt(gameState.toPosition - 1)) && gameState.toPosition > 24) ||
                        (OPPONENT_PAWNS & (1n << BigInt(gameState.toPosition + 1)) && gameState.toPosition < 39)) {
                        // marca o própio peão para ser capturado pelo movimento en passant
                        gameState.enPassant = gameState.toPosition;
                    } else {
                        // Desmarca o peão que pode ser capturado en passant
                        gameState.enPassant = null;
                    }
                } else {
                    gameState.enPassant = null;
                }
                gameState.halfMoves = 0;
                break;
            case KING:
                // verifica se o movimento foi um roque
                if (Math.abs(gameState.fromPosition - gameState.toPosition) === 2) {
                    // Efeito sonoro de roque
                    playSound(CASTLING_SOUND);
                    isPlayedSound = true;
                    // Adicionar torre na posição do roque curto
                    if (gameState.toPosition === gameState.fromPosition - 2) {
                        // Roque do lado do rei
                        gameState.bitboards[gameState.selectedColor][ROOK] &= ~(1n << BigInt(gameState.fromPosition - 3));
                        gameState.bitboards[gameState.selectedColor][ROOK] |= 1n << BigInt(gameState.fromPosition - 1);
                    }
                    // Adicionar torre na posição do roque longo
                    else if (gameState.toPosition === gameState.fromPosition + 2) {
                        // Roque do lado da rainha
                        gameState.bitboards[gameState.selectedColor][ROOK] &= ~(1n << BigInt(gameState.fromPosition + 4));
                        gameState.bitboards[gameState.selectedColor][ROOK] |= 1n << BigInt(gameState.fromPosition + 1);
                    }
                }
                if (gameState.selectedColor === WHITE) {
                    gameState.availableCastlingMask &= ~(WHITE_ROOK_KINGSIDE | WHITE_ROOK_QUEENSIDE); // Remove KQ
                } else {
                    gameState.availableCastlingMask &= ~(BLACK_ROOK_KINGSIDE | BLACK_ROOK_QUEENSIDE); // Remove kq
                }
                break;
            case ROOK:
                if (1n << BigInt(gameState.fromPosition) & gameState.availableCastlingMask) {
                    switch (1n << BigInt(gameState.fromPosition)) {
                        case WHITE_ROOK_QUEENSIDE:
                            gameState.availableCastlingMask &= ~WHITE_ROOK_QUEENSIDE; // Remove Q
                            break;
                        case WHITE_ROOK_KINGSIDE:
                            gameState.availableCastlingMask &= ~WHITE_ROOK_KINGSIDE; // Remove K
                            break;
                        case BLACK_ROOK_QUEENSIDE:
                            gameState.availableCastlingMask &= ~BLACK_ROOK_QUEENSIDE; // Remove q
                            break;
                        case BLACK_ROOK_KINGSIDE:
                            gameState.availableCastlingMask &= ~BLACK_ROOK_KINGSIDE; // Remove k
                            break;
                    }
                }
                break;
        }

        // Verifica se houve captura de peça
        if (TO_MASK & OPPONENT_PIECES) {
            // Iteração nas bitboards adversárias, para saber qual peça foi capturada
            for (let opponentPiece = 0; opponentPiece < 6; opponentPiece++) {
                if (gameState.bitboards[OPPONENT_COLOR][opponentPiece] & TO_MASK) {
                    // Remove a peça adversária
                    gameState.bitboards[OPPONENT_COLOR][opponentPiece] &= ~TO_MASK;
                    // Verifica se a peça capturada foi uma torre
                    if (opponentPiece === ROOK && gameState.availableCastlingMask !== 0n) {
                        switch (TO_MASK) {
                            case WHITE_ROOK_QUEENSIDE:
                                gameState.availableCastlingMask &= ~WHITE_ROOK_QUEENSIDE; // Remove Q
                                break;
                            case WHITE_ROOK_KINGSIDE:
                                gameState.availableCastlingMask &= ~WHITE_ROOK_KINGSIDE; // Remove K
                                break;
                            case BLACK_ROOK_QUEENSIDE:
                                gameState.availableCastlingMask &= ~BLACK_ROOK_QUEENSIDE; // Remove q
                                break;
                            case BLACK_ROOK_KINGSIDE:
                                gameState.availableCastlingMask &= ~BLACK_ROOK_KINGSIDE; // Remove k
                                break;
                        }
                    }
                }
            }
            isPlayedSound = true;
            isCapture = true;
            gameState.enPassant = null;
            gameState.halfMoves = 0;
        }
        // Verifica se o rei adversário está em xeque
        let opponentKingCheck = isKingInCheck(gameState.bitboards, OPPONENT_COLOR);
        if (opponentKingCheck) {
            gameState.kingCheckMask = opponentKingCheck; // Marca o rei adversário
            // verifica se o rei adversário está em xeque mate
            if (getDefenderMovesMask(gameState, OPPONENT_COLOR) === 0n) {
                gameState.isMate = true;
                showCheckmate(gameState);
            }
            else {
                // Efeito sonoro de xeque
                playSound(CHECK_SOUND);
                isPlayedSound = true;
            }
        }
        // Verifica o empate por afogameStatento
        else if (getMovesMask(OPPONENT_COLOR, gameState.bitboards, gameState.enPassant) === 0n) {
            showDraw(gameState);
        }
        else {
            // Desmarca o rei em xeque
            gameState.kingCheckMask = 0n;
        }
        if (isCapture) {
            // Efeito sonoro de captura
            playSound(CAPTURE_SOUND);
        }
        else if (!isPlayedSound) {
            // Efeito sonoro de movimento
            playSound(MOVE_SOUND);
        }
        // Contagem das jogadas completas
        if (gameState.turn === BLACK) {
            gameState.fullMoves++;
        }
        // Atualiza o turno
        gameState.turn = gameState.turn === WHITE ? BLACK : WHITE;
        if (!isImportPGN) {
            // Atualiza a FEN no layout
            updateFEN(gameState);
            // Registra o movimento em notação algébrica
            const isCheck = gameState.kingCheckMask !== 0n;
            gameState.metadata.moves.push(getSanMove(gameState.fromPosition, gameState.toPosition, gameState.selectedPiece, isCapture, null, isCheck, gameState.isMate));
            // Atualiza o PGN no layout
            updatePGN(gameState);

            if (isEngineTurn && playAgainstStockfish) {
                // Mostrar o tabuleiro no console
                stockfish.postMessage('position fen ' + gameState.fen);
                // Solicitar o melhor movimento com profundidade 2
                stockfish.postMessage('go depth 12');
            } else if (!isEngineTurn && playAgainstStockfish) {
                isEngineTurn = true;
            }
        }
        // Verificar se houve empate por repetições ....

        // Atualizar o ultimo movimento
        gameState.lastMoveMask = 1n << BigInt(gameState.fromPosition) | 1n << BigInt(gameState.toPosition);
    } else {
        // Efeito sonoro de movimento inválido
        playSound(FAILURE_SOUND);
        gameState.invalidMove = getSanMove(gameState.fromPosition, gameState.toPosition, gameState.selectedPiece, false, null, false, false);
    }
}

function playSound(file) {
    if (!isImportPGN) {
        file.play();
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
function renderBoard(gameState) {
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
            if (gameState.kingCheckMask === 1n << BigInt(index)) {
                square.className = "check";
            }
            else {
                // Adiciona a classe de acordo com a cor do quadrado
                square.className = (rank + file) % 2 === 0 ? "white" : "black"; // alternância de cores
            }
            if (gameState.fromPosition === index || gameState.lastMoveMask & (1n << BigInt(index))) {
                square.classList.add("selected");
            }
            // Adiciona a decoração dos movimentos possíveis
            if (gameState.availableMoves & (1n << BigInt(index))) {
                const OPPONENT_COLOR = gameState.selectedColor === WHITE ? BLACK : WHITE;
                const OPPONENT_PIECES = gameState.bitboards[OPPONENT_COLOR][PAWN] | gameState.bitboards[OPPONENT_COLOR][KNIGHT] | gameState.bitboards[OPPONENT_COLOR][BISHOP]
                    | gameState.bitboards[OPPONENT_COLOR][ROOK] | gameState.bitboards[OPPONENT_COLOR][QUEEN] | gameState.bitboards[OPPONENT_COLOR][KING];
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
    updatePiecesOnBoard(gameState);
}

// Evento de clique com o botão direito do mouse
function handleRightClick(event) {
    event.preventDefault(); // Previne a abertura do menu de contexto padrão do navegador
    // Alterna a classe de pré-visualização
    event.currentTarget.classList.toggle('preview');
    // DEBUG
    // console.log(event.currentTarget.dataset.index);
}

function promotionPawn(gameState) {
    const boardElement = document.getElementById("chessboard");
    const squares = boardElement.getElementsByTagName("td");

    // Remove os efeitos visuais e adiciona esmaecimento a todos os quadrados
    for (let square of squares) {
        square.classList.remove("available", "selected");
        square.classList.add("dimmed");
        square.removeEventListener("click", handleOnMoveClick);
        // Adiciona o evento de clique a todos os quadrados
        square.addEventListener("click", (event) => handlePromotionClick(event, gameState));
    }

    // Determina as posições das peças que aparecerão para a promoção (em relação ao bitboard)
    const promotionPositions = gameState.selectedColor === WHITE ?
        [gameState.toPosition, gameState.toPosition - 8, gameState.toPosition - 16, gameState.toPosition - 24] :
        [gameState.toPosition, gameState.toPosition + 8, gameState.toPosition + 16, gameState.toPosition + 24];

    // Evento de clique para a promoção
    function handlePromotionClick(event, game) {
        // Obtem a mascara da posição de destino e origem
        const TO_MASK = 1n << BigInt(game.toPosition);
        const FROM_MASK = 1n << BigInt(game.fromPosition);

        // Obtém a peça selecionada para a promoção
        const index = parseInt(event.currentTarget.dataset.index);
        // Verificar se houve captura de peça
        let isCapture = false;
        let opponentPiece = null;
        // Verifica se a peça selecionada está entre as posições de promoção
        if (promotionPositions.includes(index)) {
            // Obtém a peça de promoção
            let promotionPiece = getPromotionPiece(index);
            // Remove o peão
            game.bitboards[game.selectedColor][PAWN] &= ~TO_MASK;
            // Adiciona a peça promovida
            game.bitboards[game.selectedColor][promotionPiece] |= TO_MASK;
            // Cor da peça adversária
            const OPPONENT_COLOR = game.selectedColor === WHITE ? BLACK : WHITE;
            // Bitboards das peças adversárias
            const OPPONENT_PIECES = game.bitboards[OPPONENT_COLOR][PAWN] | game.bitboards[OPPONENT_COLOR][KNIGHT] | game.bitboards[OPPONENT_COLOR][BISHOP]
                | game.bitboards[OPPONENT_COLOR][ROOK] | game.bitboards[OPPONENT_COLOR][QUEEN] | game.bitboards[OPPONENT_COLOR][KING];
            // Verifica se houve captura de peça
            if (TO_MASK & OPPONENT_PIECES) {
                isCapture = true;
                // remove a peça adversária
                for (let op = 0; op < 6; op++) {
                    if (game.bitboards[OPPONENT_COLOR][op] & TO_MASK) {
                        // Marca a peça adversária capturada
                        opponentPiece = op;
                        // Remove a peça adversária
                        game.bitboards[OPPONENT_COLOR][op] &= ~TO_MASK;
                    }
                }
            }
            // Verifica se o rei adversário está em xeque
            let opponentKingCheck = isKingInCheck(game.bitboards, OPPONENT_COLOR);
            if (opponentKingCheck) {
                game.kingCheckMask = opponentKingCheck; // Marca o rei adversário
                // verifica se o rei adversário está em xeque mate
                if (getDefenderMovesMask(game, OPPONENT_COLOR) === 0n) {
                    game.isMate = true;
                    showCheckmate(game);
                }
                else {
                    // Efeito sonoro de xeque
                    playSound(CHECK_SOUND);
                }
            }
            // Verifica o empate por afogameStatento
            else if (getMovesMask(OPPONENT_COLOR, game.bitboards, game.enPassant) === 0n) {
                showDraw(game);
            }
            else {
                // Desmarca o rei em xeque
                game.kingCheckMask = 0n;
            }
            if (isCapture) {
                // Efeito sonoro de captura
                playSound(CAPTURE_SOUND);
            }
            else {
                playSound(MOVE_SOUND);
            }
            // Contagem das jogadas completas
            if (game.turn === BLACK) {
                game.fullMoves++;
            }
            // Atualiza o turno
            game.turn = game.turn === WHITE ? BLACK : WHITE;
            // Atualiza a FEN no layout
            updateFEN(game);
            // Registra o movimento em notação algébrica
            const isCheck = game.kingCheckMask !== 0n;
            game.metadata.moves.push(getSanMove(game.fromPosition, game.toPosition, game.selectedPiece, isCapture, promotionPiece, isCheck, gameState.isMate));
            // Atualiza o PGN no layout
            updatePGN(game);
        }
        else {
            // Restaura o peão
            game.bitboards[game.selectedColor][PAWN] |= FROM_MASK;
            // Remove o peão da nova posição
            game.bitboards[game.selectedColor][PAWN] &= ~TO_MASK;
            if (isCapture) {
                // Restaura a peça capturada
                game.bitboards[OPPONENT_COLOR][opponentPiece] |= TO_MASK;
            }
        }

        gameState.lastMoveMask = FROM_MASK | TO_MASK;
        gameState.fromPosition = null;
        gameState.selectedColor = null;
        gameState.toPosition = null;
        gameState.availableMoves = 0n;
        // Atualiza o tabuleiro com a peça promovida
        renderBoard(game);
        game.isPromotion = false;
    }

    // Adiciona as peças de promoção e destaca os quadrados
    for (let i in promotionPositions) {
        // Obtém o índice do quadrado
        const indexHTML = 63 - promotionPositions[i];
        // Obtém o quadrado
        const square = squares[indexHTML];
        // Adiciona a peça ao tabuleiro
        addPieceToBoard(promotionPositions[i], getPromotionPiece(indexHTML), gameState.selectedColor);
        // Remove o efeito de esmaecimento
        square.classList.remove("dimmed");
        // Adiciona o efeito de promoção
        square.classList.add("promotion");
        // Define o índice para identificar qual quadrado foi clicado
        square.dataset.index = promotionPositions[i];
    }
}

function showCheckmate(gameState) {
    // Efeito sonoro de xeque mate
    END_SOUND.play();
    // PGN
    gameState.metadata.result = gameState.selectedColor === WHITE ? "1-0" : "0-1";
    // Indica o vencedor
    let winner = gameState.selectedColor === WHITE ? "White" : "Black";
    // Atualiza a mensagem de xeque mate
    document.getElementById("end-game-message").textContent = "Checkmate!\n" + winner + " wins.";
    // Exibe a mensagem de xeque mate
    document.getElementById("end").style.display = "flex";
    // callback do botão restart
    document.getElementById("restart-button").addEventListener("click", function () {
        // Oculta a mensagem de xeque mate
        document.getElementById("end").style.display = "none";
        // Reinicia o jogo
        restart(gameState);
    });


}

function showDraw(gameState) {
    // Efeito sonoro de empate
    END_SOUND.play();
    // PGN
    gameState.metadate.result = "1/2-1/2";
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
function updatePiecesOnBoard(gameState) {
    // Obtem o tabuleiro
    const boardElement = document.getElementById("chessboard");
    // Limpar peças existentes no tabuleiro
    boardElement.querySelectorAll(".piece").forEach(piece => piece.remove());
    // Adicionar peças atuais ao tabuleiro
    for (let color = 0; color < 2; color++) {
        // Iteração de todas as peças
        for (let piece = 0; piece < 6; piece++) {
            let bitboard = gameState.bitboards[color][piece]; // Obtem o bitboard da peça
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

function getAvailableMoves(game) {
    // Obtem os movimentos possíveis da peça
    let moves = getPieceMovesMask(game.fromPosition, game.selectedPiece, game.selectedColor, game.bitboards, game.enPassant);
    // Verifica se o rei está em xeque
    if (isKingInCheck(game.bitboards, game.selectedColor)) {
        // movimentos possiveis para se defender do xeque
        let allDefenderMoves = getDefenderMovesMask(game, game.selectedColor);
        // Verifica se a peça pode se mover para defender o rei
        if ((moves & allDefenderMoves) !== 0n) {
            game.availableMoves = (moves & allDefenderMoves);
        }
        return;
    }
    // Verifica se a peça está cravada
    const isPinned = isPinnedMask(game.fromPosition, game.bitboards);
    // Verifica se a peça está cravada e pode se mover
    if (isPinned !== null && isPinned && game.selectedPiece !== KING) {
        game.availableMoves = isPinned;
        return;
    }
    // Verifica se a peça está cravada e não pode se mover
    else if (isPinned !== null && !isPinned && game.selectedPiece !== KING) {
        gameState.availableMoves = 0n;
        return;
    }
    game.availableMoves = moves;
    // Verifica se a mascara de roque está disponível
    if (game.availableCastlingMask !== 0n && game.selectedPiece === KING) {
        game.availableMoves |= getCastlingMovesMask(game.selectedColor, game);
    }
}

// Função para selecionar e mover a peça
function onMove(gameState, position) {
    // Verifica se a peça ainda não foi selecionada
    if (gameState.fromPosition === null) {
        for (let color = 0; color < 2; color++) {
            for (let piece = 0; piece < 6; piece++) {
                if (gameState.bitboards[color][piece] & (1n << BigInt(position))) {
                    // Verifica se a peça pertence ao jogador do turno atual
                    if (color !== gameState.turn) {
                        return;
                    }
                    // Obtem o tipo da peça, a cor e a posição de origem
                    gameState.selectedPiece = piece;
                    gameState.selectedColor = color;
                    gameState.fromPosition = position;
                    // Redefine a máscara de movimentos disponíveis
                    gameState.availableMoves = 0n;
                    // Obtem os movimentos disponíveis
                    getAvailableMoves(gameState);
                }
            }
        }
    } else {
        // Obtem a posição de destino
        gameState.toPosition = position;
        // Obtem as peças do jogador atual
        const OWN_PIECES = gameState.bitboards[gameState.turn][PAWN] | gameState.bitboards[gameState.turn][KNIGHT] | gameState.bitboards[gameState.turn][BISHOP]
            | gameState.bitboards[gameState.turn][ROOK] | gameState.bitboards[gameState.turn][QUEEN] | gameState.bitboards[gameState.turn][KING];
        // Verifica se a peça de origem é da mesma cor que a de destino
        if (OWN_PIECES & (1n << BigInt(gameState.toPosition))) {
            gameState.fromPosition = null;
            gameState.selectedColor = null;
            gameState.availableMoves = 0n;
            // Refaz a seleção da peça
            onMove(gameState, gameState.toPosition);
            return;
        } else {
            // Verifica se o movimento não é ilegal
            if (!isIllegalMove(gameState)) {
                // Movimenta a peça
                movePiece(gameState);
            }
            else {
                // Efeito sonoro de movimento inválido
                FAILURE_SOUND.play();
            }
        }
        // Atualiza as variáveis para o próximo movimento, se não estiver ocorrendo uma promoção de peão
        if (!gameState.isPromotion) {
            gameState.fromPosition = null;
            gameState.selectedColor = null;
            gameState.toPosition = null;
            gameState.availableMoves = 0n;
        }
    }
    // Se não estiver ocorrendo uma promoção de peão
    if (!gameState.isPromotion) {
        renderBoard(gameState); // Renderiza o tabuleiro
    }
}

// Função para lidar com o clique no quadrado da tabela
function handleOnMoveClick(event) {
    // Obtem o indice do quadrado clicado
    const index = parseInt(event.currentTarget.dataset.index);
    // Verificações que antecedem o movimento
    onMove(gameState, index);
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
function generateFEN(gameState) {
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
                if (gameState.bitboards[WHITE][i] & (1n << BigInt(index))) {
                    // Converte a peça para a notação FEN
                    piece = PIECES[i].toUpperCase();
                    break;
                } else if (gameState.bitboards[BLACK][i] & (1n << BigInt(index))) {
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
    fen += gameState.turn === WHITE ? " w " : " b ";

    // Obtem as possibilidades de roque
    fen += getCastlingFEN(gameState.availableCastlingMask);

    // Verifica se existe a possibilidade de captura en passant
    if (gameState.enPassant !== null) {
        // converte a posição en passant para a notação FEN
        const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"];
        let y = LETTERS[7 - (gameState.enPassant % 8)];
        let x = 1 + Math.trunc(gameState.enPassant / 8);
        // Adiciona a posição de captura do en passant ao FEN
        x += gameState.turn === WHITE ? 1 : -1;
        fen += " " + y + x + " ";
    } else {
        fen += " - ";
    }

    // Contador de meios movimentos
    fen += gameState.halfMoves + " ";
    // Adiciona o número de jogadas completas
    fen += gameState.fullMoves;

    return fen;
}

function updateFEN(gameState) {
    gameState.fen = generateFEN(gameState);
    document.getElementById("fen").value = gameState.fen;
}

// Verificação do estado dos roques disponíveis
function getCastlingFEN(availableCastlingMask) {
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
function getMovesMask(color, bitboards, enPassant) {
    let allMoves = 0n;
    // Iteração das peças
    for (let piece = 0; piece < 6; piece++) {
        let bitboard = bitboards[color][piece];
        // Iteração das posições presentes em cada bitboard
        for (let i = 0; i < 64; i++) {
            // Verifica se existe uma peça na posição i
            if (bitboard & (1n << BigInt(i))) {
                // Adiciona os movimentos possíveis da peça a todos os movimentos
                allMoves |= getPieceMovesMask(i, piece, color, bitboards, enPassant);
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
    // remove a peça aliada da posição de origem
    tempBitboards[color][piece] &= ~(1n << BigInt(fromPosition));
    // Mascara de bits do ataque (posição da peça e quadrados atacados)
    let attackerMask = 0n;
    // Contador de peças atacantes
    let count = 0;
    // Mascara de bits dos movimentos inimigos
    const ENEMY_MOVES = getMovesMask(OPPONENT_COLOR, tempBitboards, null);
    // verifica se o bitboard do rei coincide com algum bit de todos os movimentos de ataque das peças inimigas
    if (KING_MASK & ENEMY_MOVES) {
        // Obtem o attackMask
        for (let p = 0; p < 6; p++) {
            // Obtem o bitboard da peça
            let bitboard = tempBitboards[OPPONENT_COLOR][p];
            // Percorre as posições do bitboard
            for (let i = 0; i < 64; i++) {
                // Verifica se existe uma peça na posição i
                if (bitboard & (1n << BigInt(i))) {
                    // Escolhe o tipo da peça
                    switch (p) {
                        case ROOK:
                            // Verifica se a peça pode atacar o rei
                            if (getRookMoves(i, OPPONENT_COLOR, tempBitboards) & KING_MASK) {
                                attackerMask |= 1n << BigInt(i);
                                count++;
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
                                count++;
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
                                count++;
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
                        case KNIGHT:
                        case KING:
                            // Não realizam ataques descobertos
                            break;
                        default:
                            throw new Error("Invalid piece!");
                    }
                }
            }
        }
        // Verifica se o rei recebe mais de um ataque quando a peça selecionada é removida
        if (count > 1) {
            return 0n;
        }
        // Movimentos que a peça pode realizar: capturar ou entrar na linha de ataque
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
function getPieceMovesMask(from, piece, color, bitboards, enPassant) {
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
function isIllegalMove(gameState) {
    const OPPONENT_COLOR = gameState.selectedColor === WHITE ? BLACK : WHITE;
    // Copia o estado atual das peças
    let tempBitboards = [
        gameState.bitboards[WHITE].map(bitboard => BigInt(bitboard)),
        gameState.bitboards[BLACK].map(bitboard => BigInt(bitboard))
    ];
    // Remove a posição de origem
    tempBitboards[gameState.selectedColor][gameState.selectedPiece] &= ~(1n << BigInt(gameState.fromPosition));
    // Adiciona na nova posição
    tempBitboards[gameState.selectedColor][gameState.selectedPiece] |= 1n << BigInt(gameState.toPosition);
    // remove a peça adversária da posição de destino
    for (let p = 0; p < 6; p++) {
        tempBitboards[OPPONENT_COLOR][p] &= ~(1n << BigInt(gameState.toPosition));
    }
    // Retorna verdadeiro se o rei estiver em xeque
    return isKingInCheck(tempBitboards, gameState.selectedColor);
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
function getDefenderMovesMask(game, color) {
    // Copia o estado atual das peças
    let tempBitboards = [
        game.bitboards[WHITE].map(bitboard => BigInt(bitboard)), // Copia o array de peças brancas
        game.bitboards[BLACK].map(bitboard => BigInt(bitboard))  // Copia o array de peças pretas
    ];
    const KING_MASK = game.bitboards[color][KING];
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
                        const PAWN_ATTACKER_MASK = getPawnAttackerMask(i, OPPONENT_COLOR);
                        if (PAWN_ATTACKER_MASK & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            attackerMask |= (PAWN_ATTACKER_MASK & KING_MASK);
                        }
                        break;
                    case KNIGHT:
                        // Verifica se o cavalo ataca o rei
                        const KNIGHT_ATTACKER_MASK = getKnightMoves(i, OPPONENT_COLOR, tempBitboards);
                        if (KNIGHT_ATTACKER_MASK & KING_MASK) {
                            attackersCount++;
                            attackerPositionMask |= 1n << BigInt(i);
                            attackerMask |= (KNIGHT_ATTACKER_MASK & KING_MASK);
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }
    // Posicao do rei
    let kingIndexPosition = 0;
    // Obtem a posição do rei
    for (let i = 0; i < 64; i++) {
        if (KING_MASK & (1n << BigInt(i))) {
            kingIndexPosition = i;
            break;
        }
    }
    // Mascara de bits dos movimentos de defesa
    let defenderMask = 0n;
    // Obtem os movimentos possíveis do rei
    let kingMovesMask = getKingSafeMoves(kingIndexPosition, color, tempBitboards);
    // adiciona os movimentos do rei na mascara de defesa
    defenderMask |= kingMovesMask;
    // Peça que está atacando o rei
    let opponentPiece = null;
    // Se for atacado por mais de uma peça, somente o movimento de rei é possível	
    if (attackersCount > 1) {
        return kingMovesMask;
    }

    // Verificar se alguma peça aliada pode capturar ou entrar na frente de quem está atacando o rei
    for (let p = 0; p < 6; p++) {
        // Bitboard da peça
        let bitboard = tempBitboards[color][p];
        // Percorre as posições do bitboard
        for (let i = 0; i < 64; i++) {
            // Verifica se existe uma peça na posição i
            if (bitboard & (1n << BigInt(i))) {
                // raio-x na peça adversária
                let isXrayOpponentPiece = false;
                // Remove temporariamente a peça que está atacando o rei
                for (let op = 0; op < 6; op++) {
                    if (tempBitboards[OPPONENT_COLOR][op] & attackerPositionMask) {
                        tempBitboards[OPPONENT_COLOR][op] &= ~attackerPositionMask;
                        opponentPiece = op;
                        break;
                    }
                }
                // Verifica se existe uma peça que realiza raio-x quando a peça do adversario é removida
                if (isKingInCheck(tempBitboards, color)) {
                    // Coloca temporariamente um peão aliado na posição da peça adversária removida
                    tempBitboards[color][PAWN] |= attackerPositionMask;
                    // Indica essa alteração
                    isXrayOpponentPiece = true;
                }
                // Remove temporariamente a peça defensora
                tempBitboards[color][p] &= ~(1n << BigInt(i));
                // Verifica se o rei fica em xeque após a remoção da peça defensora
                let pinnedAnotherPiece = isKingInCheck(tempBitboards, color);
                // Remove o peão adicionado temporariamente (se adicionado)
                if (isXrayOpponentPiece) tempBitboards[color][PAWN] &= ~attackerPositionMask;
                // Restaura as peças que foram removidas
                tempBitboards[color][p] |= 1n << BigInt(i);
                tempBitboards[OPPONENT_COLOR][opponentPiece] |= attackerPositionMask;
                // Se não estiver cravada por outro ataque
                if (!pinnedAnotherPiece) {
                    // Escolhe o tipo da peça
                    switch (p) {
                        case PAWN:
                            let pawnMoves = getPawnMoves(i, color, tempBitboards, game.enPassant);
                            // Verifica se o peão pode se mover para a posição do ataque
                            if (pawnMoves & attackerMask) {
                                defenderMask |= (pawnMoves & attackerMask);
                            }
                            // Verifica se o peão pode capturar a peça que está atacando o rei
                            let pawnAttackerMask = getPawnAttackerMask(i, color);
                            if (pawnAttackerMask & attackerPositionMask) {
                                defenderMask |= (pawnAttackerMask & attackerPositionMask);
                            }
                            break;
                        case ROOK:
                            let rookMoves = getRookMoves(i, color, tempBitboards);
                            defenderMask |= (rookMoves & (attackerMask | attackerPositionMask));
                            break;
                        case KNIGHT:
                            let knightMoves = getKnightMoves(i, color, tempBitboards);
                            defenderMask |= (knightMoves & (attackerMask | attackerPositionMask));
                            break;
                        case BISHOP:
                            let bishopMoves = getBishopMoves(i, color, tempBitboards);
                            defenderMask |= (bishopMoves & (attackerMask | attackerPositionMask));
                            break;
                        case QUEEN:
                            let queenMoves = getQueenMoves(i, color, tempBitboards);
                            defenderMask |= (queenMoves & (attackerMask | attackerPositionMask));
                            break;
                        case KING:
                            // O rei não pode defender ele mesmo
                            break;
                        default:
                            throw new Error(`${p} Invalid piece!`);

                    }
                }

                // console.log("Defender Mask:" + i);
                // console.log(defenderMask.toString(2).padStart(64, "0").match(/.{8}/g).join("\n"));

            }
        }
    }

    return defenderMask;
}

function getCastlingMovesMask(color, gameState) {
    // Mascara de bits dos movimentos de roque
    let castlingMoves = 0n;
    // Mascara de bits de todas as peças do tabuleiro
    const BLACK_PIECES = gameState.bitboards[BLACK][PAWN] | gameState.bitboards[BLACK][KNIGHT] | gameState.bitboards[BLACK][BISHOP] | gameState.bitboards[BLACK][ROOK]
        | gameState.bitboards[BLACK][QUEEN] | gameState.bitboards[BLACK][KING];
    const WHITE_PIECES = gameState.bitboards[WHITE][PAWN] | gameState.bitboards[WHITE][KNIGHT] | gameState.bitboards[WHITE][BISHOP] | gameState.bitboards[WHITE][ROOK]
        | gameState.bitboards[WHITE][QUEEN] | gameState.bitboards[WHITE][KING];
    const ALL_PIECES = BLACK_PIECES | WHITE_PIECES;
    // Verifica se o rei está em xeque
    if (isKingInCheck(gameState.bitboards, color)) return 0n;
    // Verifica a cor das peças
    if (color === WHITE) {
        // Verifica a torre da ala do rei
        if (gameState.availableCastlingMask & WHITE_ROOK_KINGSIDE) {
            // Verifica se as casas entre o rei e a torre estão vazias
            if (!(WHITE_KINGSIDE_CASTLING_EMPTY & ALL_PIECES)) {
                // Verifica se o rei pode ir para a posição F1 
                if (getKingSafeMoves(3, WHITE, gameState.bitboards) & 1n << BigInt(2)) {
                    // verifica se pode ir para posição final G1 (da posição F1)
                    if (getKingSafeMoves(2, WHITE, gameState.bitboards) & 1n << BigInt(1)) {
                        // Adiciona o roque curto na mascara de movimentos
                        castlingMoves |= 1n << BigInt(1);
                    }
                }
            }
        }
        // Verifica a torre da ala da dama
        if (gameState.availableCastlingMask & WHITE_ROOK_QUEENSIDE) {
            // Verifica se as casas entre o rei e a torre estão vazias
            if (!(WHITE_QUEENSIDE_CASTLING_EMPTY & ALL_PIECES)) {
                // Verifica se o rei pode ir para a posição D1
                if (getKingSafeMoves(3, WHITE, gameState.bitboards) & 1n << BigInt(4)) {
                    // verifica se pode ir para posição final C1 (da posição D1)
                    if (getKingSafeMoves(4, WHITE, gameState.bitboards) & 1n << BigInt(5)) {
                        // Adiciona o roque grande na mascara de movimentos
                        castlingMoves |= 1n << BigInt(5);
                    }
                }
            }
        }
    } else { // color === BLACK
        // Verifica a torre da ala do rei
        if (gameState.availableCastlingMask & BLACK_ROOK_KINGSIDE) {
            // Verifica se as casas entre o rei e a torre estão vazias
            if (!(BLACK_KINGSIDE_CASTLING_EMPTY & ALL_PIECES)) {
                // Verifica se o rei pode ir para a posição F8
                if (getKingSafeMoves(59, BLACK, gameState.bitboards) & 1n << BigInt(58)) {
                    // verifica se pode ir para posição final G8 (da posição F8)
                    if (getKingSafeMoves(58, BLACK, gameState.bitboards) & 1n << BigInt(57)) {
                        // Adiciona o roque curto na mascara de movimentos
                        castlingMoves |= 1n << BigInt(57);
                    }
                }
            }
        }
        // Verifica a torre da ala da dama
        if (gameState.availableCastlingMask & BLACK_ROOK_QUEENSIDE) {
            // Verifica se as casas entre o rei e a torre estão vazias
            if (!(BLACK_QUEENSIDE_CASTLING_EMPTY & ALL_PIECES)) {
                // Verifica se o rei pode ir para a posição D8
                if (getKingSafeMoves(59, BLACK, gameState.bitboards) & 1n << BigInt(60)) {
                    // verifica se pode ir para posição final C8 (da posição D8)
                    if (getKingSafeMoves(60, BLACK, gameState.bitboards) & 1n << BigInt(61)) {
                        // Adiciona o roque grande na mascara de movimentos
                        castlingMoves |= 1n << BigInt(61);
                    }
                }
            }
        }
    }
    return castlingMoves;
}

function restart(game) {
    initialize(game);
    renderBoard(game);
    updateFEN(game);
    updatePGN(game);
}

// Portable gameState Notation
function generatePGN(gameState) {
    let pgn = "";
    // Metadados da partida
    pgn += `[Event "${gameState.metadata.event}"]\n`;
    pgn += `[Site "${gameState.metadata.site}"]\n`;
    pgn += `[Date "${gameState.metadata.date}"]\n`;
    pgn += `[Round "${gameState.metadata.round}"]\n`;
    pgn += `[White "${gameState.metadata.white}"]\n`;
    pgn += `[Black "${gameState.metadata.black}"]\n`;
    pgn += `[Result "${gameState.metadata.result}"]\n\n`;
    // Movimentos da partida
    for (let i = 0; i < gameState.metadata.moves.length; i++) {
        if (i % 2 === 0) {
            pgn += `${Math.floor(i / 2) + 1}. `;
        }
        pgn += `${gameState.metadata.moves[i]} `;
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

function updatePGN(gameState) {
    let pgn = generatePGN(gameState);
    const TEXTAREA = document.getElementById("pgn");
    // Obter apenas a sequência de movimentos
    TEXTAREA.value = pgn.replace(/\[.*?\]/g, '').trim();
    // TEXTAREA.value = pgn;
    TEXTAREA.scrollTop = TEXTAREA.scrollHeight; // Rolar para o final do textarea
    hideImportPGNError();
}

function initialize(game) {
    // Reseta as variáveis da partida
    game.lastMoveMask = 0n;
    game.availableMoves = 0n;
    game.selectedPiece = null;
    game.selectedColor = null;
    game.fromPosition = null;
    game.toPosition = null;
    game.enPassant = null;
    game.turn = WHITE;
    game.fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    game.halfMoves = 0;
    game.fullMoves = 1;
    game.kingCheckMask = 0n;
    game.availableCastlingMask = WHITE_ROOK_KINGSIDE | WHITE_ROOK_QUEENSIDE | BLACK_ROOK_KINGSIDE | BLACK_ROOK_QUEENSIDE;
    // Metadados
    game.metadata = {
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
    initializeBoard(game.bitboards);
}

document.addEventListener('DOMContentLoaded', () => {
    const TEXAREA = document.getElementById('pgn');
    const BUTTON = document.getElementById('import-pgn-button');
    TEXAREA.addEventListener('focus', () => {
        BUTTON.style.visibility = "visible";
    });
    TEXAREA.addEventListener('input', () => {
        hideImportPGNError();
    });

    TEXAREA.addEventListener('blur', () => {
        setTimeout(() => {
            BUTTON.style.visibility = "hidden";
        }, 200);
    });
    BUTTON.addEventListener('click', () => {
        importPGN(TEXAREA.value);
    });
});

function showImportPGNError(move, game) {
    const IMPORT_ERROR = document.getElementById("import-error");
    if (move === null) {
        IMPORT_ERROR.textContent = "PGN is empty";
    } else {
        const count = game.metadata.moves.indexOf(move);
        if (game.turn === WHITE) { // WHITE
            IMPORT_ERROR.textContent = `Invalid move: ${Math.floor(count / 2) + 1}. ${move}`;
        } else { // BLACK
            IMPORT_ERROR.textContent = `Invalid move: ${Math.floor(count / 2) + 1}. ... ${move}`;
        }
    }
    IMPORT_ERROR.style.visibility = "visible";
    isImportPGN = false;
}

function hideImportPGNError() {
    const IMPORT_ERROR = document.getElementById("import-error");
    IMPORT_ERROR.textContent = "";
    IMPORT_ERROR.style.visibility = "hidden";
}

function testMove(sanMove, game) {
    // Remover caracteres de captura, promoção, xeque, xeque-mate e siglas para as peças
    const formattedMove = sanMove.replace(/[NBRQKx+#=]/g, ""); // exf4=ef4; e3xf4=e3f4; e4
    const FILES = "hgfedcba";
    const RANKS = "12345678";
    let fromFile = null;
    let fromRank = null;
    let toFile = null;
    let toRank = null;

    // Roque curto ou longo
    if (formattedMove === "O-O" || formattedMove === "O-O-O") {
        if (game.turn === WHITE) {
            game.fromPosition = 3;
            game.toPosition = formattedMove === "O-O" ? 1 : 5;
        } else {
            game.fromPosition = 59;
            game.toPosition = formattedMove === "O-O" ? 57 : 61;
        }
    }
    // Movimentos completos
    else if (formattedMove.length === 4) {
        // e2e4 f7f5 d2d4
        fromFile = formattedMove.charAt(0);
        fromRank = formattedMove.charAt(1);
        toFile = formattedMove.charAt(2);
        toRank = formattedMove.charAt(3);
        game.fromPosition = FILES.indexOf(fromFile) + RANKS.indexOf(fromRank) * 8;
        game.toPosition = FILES.indexOf(toFile) + RANKS.indexOf(toRank) * 8;
    }
    // Movimentos simplificados
    else if (formattedMove.length === 2) {
        // e4 f1 d8
        toFile = formattedMove.charAt(0);
        toRank = formattedMove.charAt(1);
        // Posição de destino
        game.toPosition = FILES.indexOf(toFile) + RANKS.indexOf(toRank) * 8;
        // Obter a posição de origem da peça
        let bitboard = game.bitboards[game.turn][game.selectedPiece];
        // percorrer o bitboard da peça selecionada
        for (let i = 0; i < 64; i++) {
            if (bitboard & (1n << BigInt(i))) {
                // Obter os movimentos possíveis da peça
                let moveMask = getPieceMovesMask(i, game.selectedPiece, game.turn, game.bitboards, game.enPassant);
                if (moveMask & 1n << BigInt(game.toPosition)) {
                    game.fromPosition = i;
                    break;
                }
            }
        }
    }
    // Simplificados com designação de coluna ou linha
    else if (formattedMove.length === 3) {
        // ef4 bd7 1e2 fe8
        toFile = formattedMove.charAt(1);
        toRank = formattedMove.charAt(2);
        // Obter a linha ou coluna da peça
        let fromRank = null;
        let fromFile = null;
        if (/[1-8]/.test(formattedMove.charAt(0))) fromRank = formattedMove.charAt(0);
        else if (/[a-h]/.test(formattedMove.charAt(0))) fromFile = formattedMove.charAt(0);
        // Bitboard da peça selecionada
        let bitboard = game.bitboards[game.turn][game.selectedPiece];
        // Percorrer apenas a coluna ou linha do bitboard da peça selecionada
        for (let i = 0; i < 64; i++) {
            if (bitboard & (1n << BigInt(i))) {
                if (fromRank && RANKS[Math.floor(i / 8)] === fromRank) {
                    game.fromPosition = i;
                    break;
                } else if (fromFile && FILES[i % 8] === fromFile) {
                    game.fromPosition = i;
                    break;
                }
            }
        }
        game.toPosition = FILES.indexOf(toFile) + RANKS.indexOf(toRank) * 8;
    }
    if (game.fromPosition === null || game.toPosition === null || game.fromPosition < 0 || game.toPosition < 0
        || game.fromPosition === undefined || game.toPosition === undefined) {
        game.invalidMove = sanMove;
    } else {
        getAvailableMoves(game);
        movePiece(game);
    }
}

function importPGN(pgn) {
    isImportPGN = true;
    // Função para limpar e obter o valor dos metadados
    function getMetadataValue(metadata) {
        const match = metadata.match(/"(.*)"/);
        return match ? match[1] : "";
    }
    // Iniciar o jogo temporário para importar o PGN
    let tempGame = {
        bitboards: [
            new Array(6).fill(0n),
            new Array(6).fill(0n)
        ],
        availableMoves: 0n,
        selectedPiece: null,
        selectedColor: null,
        fromPosition: null,
        toPosition: null,
        enPassant: null,
        turn: WHITE,
        fen: "",
        halfMoves: 0,
        fullMoves: 1,
        kingCheckMask: 0n,
        availableCastlingMask: 0n,
        isPromotion: false,
        isMate: false,
        metadata: {
            event: "",
            site: "",
            date: "",
            round: "",
            white: "",
            black: "",
            result: "",
            moves: []
        },
        invalidMove: ""
    };
    initialize(tempGame);
    // Obter a sequência de movimentos
    let pgnMoves = pgn.replace(/\[.*?\]/g, '').replace(/\d+\./g, '').replace(/\s+/g, ' ').trim().split(' ');
    // Verifica se está vazio ou se os movimentos são iguais aos movimentos atuais
    if (pgnMoves.length === 0 || (pgnMoves.length === 1 && pgnMoves[0] === "")) {
        showImportPGNError(null, null);
        return;
    }
    // Inserir a lista de movimentos no jogo temporário
    tempGame.metadata.moves = pgnMoves;
    // Obter os metadados
    let metadata = pgn.match(/\[.*?\]/g);
    if (metadata) {
        metadata.forEach(data => {
            let value = getMetadataValue(data);
            if (data.includes("[Event ")) tempGame.metadata.event = value;
            else if (data.includes("[Site ")) tempGame.metadata.site = value;
            else if (data.includes("[Date ")) tempGame.metadata.date = value;
            else if (data.includes("[Round ")) tempGame.metadata.round = value;
            else if (data.includes("[White ")) tempGame.metadata.white = value;
            else if (data.includes("[Black ")) tempGame.metadata.black = value;
            else if (data.includes("[Result ")) tempGame.metadata.result = value;
        });
    }
    let count = 0;
    // Percorrer todos os movimentos
    for (let move of pgnMoves) {
        // Verificar se o movimento está formatado corretamente
        if (!move.match(/^([a-h][1-8])?[a-h][1-8](=[NBRQK])?[+#]?$/i) && // Peões
            !move.match(/^[a-h][1-8]?(x[a-h][1-8])(=[NBRQK])?[+#]?$/i) && // Captura com peão
            !move.match(/^[NBRQK]([a-h][1-8])?x?[a-h][1-8][+#]?$/i) && // Peças maiores com capturas
            !move.match(/^[NBRQK][a-h]?[1-8]?x?[a-h][1-8][+#]?$/i) && // Peças maiores movimento simplificado
            !move.match(/^O-O(-O)?$/) && // Roques
            !move.match(/^1-0$/) && // Brancas vencem
            !move.match(/^0-1$/) && // Pretas vencem
            !move.match(/^1\/2-1\/2$/)) // Empate
        {
            // Exibir mensagem de erro
            showImportPGNError(move, tempGame);
            return;
        } else {
            // Ocultar a mensagem de erro
            hideImportPGNError();
        }
        // Resultado da partida
        if (move === "1-0" || move === "0-1" || move === "1/2-1/2") {
            tempGame.metadata.result = move;
            continue;
        }
        // Obter a primeira letra do movimento
        const firstChar = move.charAt(0);
        // Selecionar o turno
        tempGame.selectedColor = tempGame.turn;
        // Verificar qual peça está se movendo
        if (firstChar === firstChar.toLowerCase()) {
            // exf4 e3xf4 (não pode capturar na mesma coluna)
            if (move.includes('x') && (move.charAt(0) === move.charAt(2) || move.charAt(0) === move.charAt(2))) {
                showImportPGNError(move, tempGame);
                return;
            }
            tempGame.selectedPiece = PAWN;

        } else {
            // Selecionar a peça
            switch (firstChar) {
                case PIECES_SAN[KNIGHT]:
                    tempGame.selectedPiece = KNIGHT;
                    break;
                case PIECES_SAN[BISHOP]:
                    tempGame.selectedPiece = BISHOP;
                    break;
                case PIECES_SAN[ROOK]:
                    tempGame.selectedPiece = ROOK;
                    break;
                case PIECES_SAN[QUEEN]:
                    tempGame.selectedPiece = QUEEN;
                    break;
                case PIECES_SAN[KING]:
                case "O":
                    tempGame.selectedPiece = KING;
                    break;
                default:
                    showImportPGNError(move, tempGame);
                    return;
            }
        }
        testMove(move, tempGame);
        if (tempGame.invalidMove) {
            showImportPGNError(move, tempGame);
            return;
        }
        count++;
    }
    // Atualizar o estado do jogo
    tempGame.availableMoves = 0n;
    tempGame.fromPosition = null;
    gameState = tempGame;
    renderBoard(gameState);
    isImportPGN = false;
    updateFEN(gameState);
    updatePGN(gameState);
}

// Função para converter coordenadas de tabuleiro para posicoes
function boardCoordToIndex(move) {
    const file = move.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(move[1], 10);
    return rank * 8 + file;
}

// Função para obter a peça em uma posição FEN dada uma coordenada
function getPieceFromFEN(fen, move) {
    const [position] = fen.split(' ');
    const rows = position.split('/');
    const index = boardCoordToIndex(move);
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

// Inicializa o jogo
initialize(gameState);
// Renderiza o tabuleiro
renderBoard(gameState);