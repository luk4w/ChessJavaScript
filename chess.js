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

// Constantes para as peças
const PAWN = 0, KNIGHT = 1, BISHOP = 2, ROOK = 3, QUEEN = 4, KING = 5;
const WHITE = 0, BLACK = 1;

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

/**
        @MASCARAS_PARA_AS_BORDAS_DO_TABULEIRO

        @const NOT_H_FILE
        @hex 0xFEFEFEFEFEFEFEFE
        @bin 11111110 11111110 11111110 11111110 11111110 11111110 1111111 011111110

        a b c d e f g h
 
        1 1 1 1 1 1 1 0   8
        1 1 1 1 1 1 1 0   7
        1 1 1 1 1 1 1 0   6
        1 1 1 1 1 1 1 0   5
        1 1 1 1 1 1 1 0   4
        1 1 1 1 1 1 1 0   3
        1 1 1 1 1 1 1 0   2
        1 1 1 1 1 1 1 0   1

        @const NOT_A_FILE
        @hex 0x7F7F7F7F7F7F7F7F
        @bin 01111111 01111111 01111111 01111111 01111111 01111111 01111111 01111111

        a b c d e f g h

        0 1 1 1 1 1 1 1   8
        0 1 1 1 1 1 1 1   7
        0 1 1 1 1 1 1 1   6
        0 1 1 1 1 1 1 1   5
        0 1 1 1 1 1 1 1   4
        0 1 1 1 1 1 1 1   3
        0 1 1 1 1 1 1 1   2
        0 1 1 1 1 1 1 1   1

        @const NOT_8_RANK
        @hex 0x00FFFFFFFFFFFFFF
        @bin 00000000 11111111 11111111 11111111 11111111 11111111 11111111 11111111

        a b c d e f g h

        0 0 0 0 0 0 0 0    8    
        1 1 1 1 1 1 1 1    7
        1 1 1 1 1 1 1 1    6
        1 1 1 1 1 1 1 1    5
        1 1 1 1 1 1 1 1    4
        1 1 1 1 1 1 1 1    3
        1 1 1 1 1 1 1 1    2
        1 1 1 1 1 1 1 1    1


        @const NOT_1_RANK
        @hex 0xFFFFFFFFFFFFFF00
        @bin 11111111 11111111 11111111 11111111 11111111 11111111 11111111 00000000

        a b c d e f g h

        1 1 1 1 1 1 1 1    8
        1 1 1 1 1 1 1 1    7
        1 1 1 1 1 1 1 1    6
        1 1 1 1 1 1 1 1    5
        1 1 1 1 1 1 1 1    4
        1 1 1 1 1 1 1 1    3
        1 1 1 1 1 1 1 1    2
        0 0 0 0 0 0 0 0    1

*/

// Mascaras para as bordas do tabuleiro
const NOT_A_FILE = 0x7F7F7F7F7F7F7F7Fn; // Máscara para eliminar a coluna A
const NOT_H_FILE = 0xFEFEFEFEFEFEFEFEn; // Máscara para eliminar a coluna H
const NOT_1_RANK = 0xFFFFFFFFFFFFFF00n; // Máscara para eliminar a linha 1
const NOT_8_RANK = 0x00FFFFFFFFFFFFFFn; // Máscara para eliminar a linha 8

// Efeitos sonoros
const MOVE_SOUND = new Audio("./sounds/move.mp3");
const CAPTURE_SOUND = new Audio("./sounds/capture.mp3");
const FAILURE_SOUND = new Audio("./sounds/failure.mp3");
const CHECK_SOUND = new Audio("./sounds/check.mp3");
// const CASTLING_SOUND = new Audio("./sounds/castling.mp3");
// const END_SOUND = new Audio("./sounds/end.mp3");

// Máscaras para os tipos de roque
const WHITE_ROOK_KINGSIDE = 0x0000000000000001n;
const WHITE_ROOK_QUEENSIDE = 0x0000000000000080n;
const BLACK_ROOK_KINGSIDE = 0x0100000000000000n;
const BLACK_ROOK_QUEENSIDE = 0x8000000000000000n;
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
    const pieces = ["pawn", "knight", "bishop", "rook", "queen", "king"];
    return (color === WHITE ? "white_" : "black_") + pieces[piece];
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
            let square = document.createElement("td"); // table data
            square.className = (rank + file) % 2 === 0 ? "white" : "black"; // alternância de cores
            if (kingCheckPosition === rank * 8 + file) {
                square.className = "check";
            }
            const index = rank * 8 + file; // index do quadrado
            square.dataset.index = index; // armazena o index do quadrado
            square.addEventListener("click", handlesquareClick); // adiciona o evento de clique
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

// Função para lidar com o clique na casa (quadrado) do tabuleiro
function handlesquareClick(event) {
    // Obtem o index do quadrado clicado
    const index = parseInt(event.currentTarget.dataset.index);
    // Verifica se a peça ainda não foi selecionada
    if (fromPosition === null) {
        for (let color = 0; color < 2; color++) {
            for (let piece = 0; piece < 6; piece++) {
                if (bitboards[color][piece] & (1n << BigInt(index))) {

                    // Verifica se a peça pertence ao jogador do turno atual
                    if (color !== currentTurn) {
                        return;
                    }

                    // Obtem o tipo da peça, a cor e a posição de origem
                    selectedPiece = piece;
                    selectedColor = color;
                    fromPosition = index;

                    // Marca a casa selecionada
                    event.currentTarget.classList.add("selected");


                    ////////////////////////////////////////////////////////////////////////////////
                    //      Corrigir a lógica para verificar se a peça está cravada (pinned)      //
                    ////////////////////////////////////////////////////////////////////////////////
                    // Quando a peça está cravada e tem possibilidade de capturar, ocorre bug     //
                    // ela nao consegue capturar a peça que está atacando                         //
                    // e ao tentar mover ela, o movimento é bloqueado e a casa do rei muda de cor //
                    ////////////////////////////////////////////////////////////////////////////////

                    if (isKingInCheck(bitboards, selectedColor)) {
                        console.log("Rei em xeque!");
                    }
                    else if (isPinned(fromPosition)) {
                        console.log("Está cravada na posição: " + fromPosition);
                        selectedPiece = null;
                        selectedColor = null;
                        fromPosition = null;
                        availableMoves = 0n;
                        // Remove a marcação do quadrado selecionado
                        document.querySelectorAll(".selected").forEach(square => square.classList.remove("selected"));
                        return;
                    }

                    // Verifica os movimentos possíveis para a peça selecionada
                    switch (selectedPiece) {
                        case PAWN:
                            availableMoves = getPawnMoves(fromPosition, selectedColor, bitboards);
                            return;
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
                    return;
                }
            }
        }
    } else {
        // Se não foi selecionada a peça, então foi selecionado o quadrado de destino

        // Obtem a posição de destino
        toPosition = index;

        // Verifica se o movimento não é ilegal
        if (!isIllegalMove()) {
            // Realiza o movimento da peça
            movePiece();
        }
        // Atualiza as variáveis para o próximo movimento
        fromPosition = null;
        selectedColor = null;
        toPosition = null;
        availableMoves = 0n;
        // Remove a marcação do quadrado selecionado
        document.querySelectorAll(".selected").forEach(square => square.classList.remove("selected"));

        // Renderiza as novas posições das peças
        renderBoard();
    }
}

// Inicializa o tabuleiro e renderiza
initializeBoard();
renderBoard();

function getPawnMoves(from, color, bitboards) {

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
    const START_ROWS = 0x00FF00000000FF00n;

    // Movimento de avanço simples
    let movement = 1n << (BigInt(from) + ADVANCE);
    // Verifica se a casa está vazia
    if (!(OPPONENT_PIECES & movement || (OWN_PIECES & movement))) {
        bitboardMoves |= movement;
    }

    // Movimento de avanço duplo
    movement = 1n << (BigInt(from) + DOUBLE_ADVANCE);
    // Verifica se o peão está nas linhas iniciais
    if (START_ROWS & (1n << BigInt(from))) {
        let middleSquare = 1n << (BigInt(from) + ADVANCE);
        // Verifica se a casa intermediaria e final estão vazias
        if (!(OPPONENT_PIECES & middleSquare || OWN_PIECES & middleSquare) && !(OPPONENT_PIECES & movement || OWN_PIECES & movement)) {
            bitboardMoves |= movement;
        }
    }

    // Movimentos de captura
    let captureLeft = color === WHITE ? ((1n << BigInt(from)) << 9n) : ((1n << BigInt(from)) >> 9n);
    let captureRight = color === WHITE ? ((1n << BigInt(from)) << 7n) : ((1n << BigInt(from)) >> 7n);

    // Verifica a captura para a direita
    if (captureLeft & OPPONENT_PIECES) {
        bitboardMoves |= captureLeft;
    }

    // Verifica a captura para a esquerda
    if (captureRight & OPPONENT_PIECES) {
        bitboardMoves |= captureRight;
    }

    // Movimento de captura en passant
    if (enPassant !== null) {

        // Posicoes laterais
        let p1 = color === WHITE ? from + 1 : from - 1;
        let p2 = color === WHITE ? from - 1 : from + 1;

        // se a posição lateral s1 for igual a do peão marcado para captura en passant
        if (p1 === enPassant) {
            bitboardMoves |= captureLeft;
        }
        // se a posição lateral s2 for igual a do peão marcado para captura en passant
        else if (p2 === enPassant) {
            bitboardMoves |= captureRight;
        }
    }

    return bitboardMoves;
}

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

function getKnightMoves(from, color, bitboards) {
    let bitboardMoves = 0n;

    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK] | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK] | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const KNIGHT_MOVES = [17, 15, 10, 6, -6, -10, -15, -17];

    for (let move of KNIGHT_MOVES) {
        // Calcula a posição do movimento
        let movement = from + move;
        // Verificação de borda para evitar saidas do tabuleiro
        if (movement >= 0 && movement < 64) {
            if (Math.abs((from % 8) - (movement % 8)) <= 2) {
                if (!(OWN_PIECES & (1n << BigInt(movement)))) {
                    bitboardMoves |= 1n << BigInt(movement);
                }
            }
        }
    }
    return bitboardMoves;
}

function getBishopMoves(from, color, bitboards) {

    let bitboardMoves = 0n;
    const BLACK_PIECES = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] | bitboards[BLACK][ROOK] | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
    const WHITE_PIECES = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] | bitboards[WHITE][ROOK] | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
    const OWN_PIECES = color === WHITE ? WHITE_PIECES : BLACK_PIECES;
    const OPPONENT_PIECES = color === WHITE ? BLACK_PIECES : WHITE_PIECES;

    /**

    from: 18 (f3)

    a b c d e f g h
    
    0 0 0 0 0 0 0 0   8
    0 0 0 0 0 0 0 0   7
    0 0 0 0 0 0 0 0   6   
    0 0 0 0 0 0 0 0   5
    0 0 0 0 0 0 0 0   4
    0 0 0 0 0 1 0 0   3   
    0 0 0 0 0 0 0 0   2
    0 0 0 0 0 0 0 0   1 
 
    */

    let movement;
    // Movimentos para a diagonal superior esquerda do bitboard
    movement = 1n << BigInt(from);
    while (movement & (NOT_A_FILE & NOT_8_RANK)) {
        movement <<= 9n; // deslocamento para diagonal superior esquerda
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    // Movimentos para a diagonal superior direita do bitboard
    movement = 1n << BigInt(from);
    while (movement & (NOT_H_FILE & NOT_8_RANK)) {
        movement <<= 7n; // deslocamento para diagonal superior direita 
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    // Movimentos para a diagonal inferior esquerda do bitboard
    movement = 1n << BigInt(from);
    while (movement & (NOT_A_FILE & NOT_1_RANK)) {
        movement >>= 7n; // deslocamento para diagonal inferior esquerda
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    // Movimentos para a diagonal inferior direita do bitboard
    movement = 1n << BigInt(from);
    while (movement & (NOT_H_FILE & NOT_1_RANK)) {
        movement >>= 9n; // deslocamento para diagonal inferior direita
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    return bitboardMoves;
}

function getQueenMoves(from, color, bitboards) {
    return getRookMoves(from, color, bitboards) | getBishopMoves(from, color, bitboards);
}

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

    return bitboardMoves;
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
                        moves |= getPawnMoves(i, color, bitboards);
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

        // console.log("positionAttackerMask:");
        // console.log(positionAttackerMask.toString(2).padStart(64, '0').match(/.{8}/g).join('\n'));

        switch (selectedPiece) {
            case PAWN:
                return (positionAttackerMask & getPawnMoves(fromPosition, selectedColor, tempBitboards)) === 0n;
            case ROOK:
                return (positionAttackerMask & getRookMoves(fromPosition, selectedColor, tempBitboards)) === 0n;
            case KNIGHT:
                return (positionAttackerMask & getKnightMoves(fromPosition, selectedColor, tempBitboards)) === 0n;
            case BISHOP:
                return (positionAttackerMask & getBishopMoves(fromPosition, selectedColor, tempBitboards)) === 0n;
            case QUEEN:
                return (positionAttackerMask & getQueenMoves(fromPosition, selectedColor, tempBitboards)) === 0n;
        }
    }
    return false;
}
function isIllegalMove() {
    // Copia o estado atual das peças
    let tempBitboards = [
        bitboards[WHITE].map(bitboard => BigInt(bitboard)),
        bitboards[BLACK].map(bitboard => BigInt(bitboard))
    ];
    // Remove a posição de origem
    tempBitboards[selectedColor][selectedPiece] &= ~(1n << BigInt(fromPosition));
    // Adiciona na nova posição
    tempBitboards[selectedColor][selectedPiece] |= 1n << BigInt(toPosition);
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