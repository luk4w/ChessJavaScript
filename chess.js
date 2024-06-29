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

         h g f e d c b a

    1    0 0 0 0 0 0 0 0
    2    1 1 1 1 1 1 1 1
    3    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    8    0 0 0 0 0 0 0 0

    BIN:
    00000000 11111111 00000000 00000000 00000000 00000000 00000000 00000000
    
    HEX:
    0x00FF000000000000

    Exemplo de bitboard para os peões pretos:


    MAIS SIGNIFICATIVO ->   0 0 0 0 0 0 0 0 
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            1 1 1 1 1 1 1 1
                            0 0 0 0 0 0 0 0  <- MENOS SIGNIFICATIVO

    BIN:
    00000000 00000000 00000000 00000000 00000000 00000000 11111111 00000000
    HEX:
    0x000000000000FF00
    
    @BigInt
    BigInt é um objeto embutido que fornece suporte para números inteiros maiores que 2^53 - 1.
    Sua representação é feita com a letra "n" no final.
*/

// Bitboards, para todas as peças
let bitboards = [
    new Array(6).fill(0n),  // 6 tipos de peças brancas
    new Array(6).fill(0n)   // 6 tipos de peças pretas
];

// Variáveis para as peças
let allPiecesWhite = 0n;
let allPiecesBlack = 0n;
let availableMoves = 0n;
let selectedPiece = null;
let selectedColor = null;
let fromPosition = null;
let toPosition = null;
let enPassant = null;

/**
        @MASCARAS_PARA_AS_BORDAS_DO_TABULEIRO

        @const NOT_A_FILE
        @HEX 0xFEFEFEFEFEFEFEFE
        @BIN 11111110 11111110 11111110 11111110 11111110 11111110 1111111 011111110

        hgfedcba

        11111110   1
        11111110   2
        11111110   3
        11111110   4
        11111110   5
        11111110   6
        11111110   7
        11111110   8

        @const NOT_H_FILE
        @HEX 0x7F7F7F7F7F7F7F7F
        @BIN 01111111 01111111 01111111 01111111 01111111 01111111 01111111 01111111

        hgfedcba

        01B11111   1
        01111111   2
        01111111   3
        01111111   4
        01111111   5
        01111111   6
        01111111   7
        01111111   8

        @const NOT_1_RANK
        @HEX 0x00FFFFFFFFFFFFFF
        @BIN 00000000 11111111 11111111 11111111 11111111 11111111 11111111 11111111

        hgfedcba

        00000000    1    
        11111111    2
        11111111    3
        11111111    4
        11111111    5
        11111111    6
        11111111    7
        11111111    8


        @const NOT_8_RANK
        @HEX 0xFFFFFFFFFFFFFF00
        @BIN 11111111 11111111 11111111 11111111 11111111 11111111 11111111 00000000

        hgfedcba

        11111111    1
        11111111    2
        11111111    3
        11111111    4
        11111111    5
        11111111    6
        11111111    7
        00000000    8

*/

// Mascaras para as bordas do tabuleiro
const NOT_A_FILE = 0xFEFEFEFEFEFEFEFEn; // Máscara para eliminar a coluna A
const NOT_H_FILE = 0x7F7F7F7F7F7F7F7Fn; // Máscara para eliminar a coluna H
const NOT_1_RANK = 0x00FFFFFFFFFFFFFFn; // Máscara para eliminar a linha 1
const NOT_8_RANK = 0xFFFFFFFFFFFFFF00n; // Máscara para eliminar a linha 8

// Inicializa o tabuleiro de xadrez com as posições iniciais das peças.
function initializeBoard() {
    // Peões
    bitboards[WHITE][PAWN] = 0x00FF000000000000n;
    bitboards[BLACK][PAWN] = 0x000000000000FF00n;
    // Cavalos
    bitboards[WHITE][KNIGHT] = 0x4200000000000000n;
    bitboards[BLACK][KNIGHT] = 0x0000000000000042n;
    // Bispos
    bitboards[WHITE][BISHOP] = 0x2400000000000000n;
    bitboards[BLACK][BISHOP] = 0x0000000000000024n;
    // Torres
    bitboards[WHITE][ROOK] = 0x8100000000000000n;
    bitboards[BLACK][ROOK] = 0x0000000000000081n;
    // Rainhas
    bitboards[WHITE][QUEEN] = 0x0800000000000000n;
    bitboards[BLACK][QUEEN] = 0x0000000000000008n;
    // Reis
    bitboards[WHITE][KING] = 0x1000000000000000n;
    bitboards[BLACK][KING] = 0x0000000000000010n;
}

// Função para atualizar os bitboards ALL_PIECES
function updateAllPieces() {

    allPiecesWhite = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] |
        bitboards[WHITE][ROOK] | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];

    allPiecesBlack = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] |
        bitboards[BLACK][ROOK] | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];
}

/** 
    @COMPORTAMENTO_DE_MEMORIA_PARA_REMOVER_PECA
 
    @FROM 8 (h2)
 
         h g f e d c b a
 
    1    0 0 0 0 0 0 0 0
    2    1 0 0 0 0 0 0 0
    3    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    8    0 0 0 0 0 0 0 0
 
 
    @BITBOARD_PAWN_WHITE
 
         h g f e d c b a
 
    1    0 0 0 0 0 0 0 0
    2    1 1 1 1 1 1 1 1
    3    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    8    0 0 0 0 0 0 0 0
 
                             bitboards[0][0]:      00000000 11111111 00000000 00000000 00000000 00000000 00000000 00000000 
                                        from:      8 (h2)
 
    @DESLOCAMENTO_A_ESQUERDA (Conversão da posição "from" para uma mascara de bits)
                          1n << BigInt(from):      00000000 10000000 00000000 00000000 00000000 00000000 00000000 00000000 
 
    @NOT
                       ~(1n << BigInt(from)):      11111111 01111111 11111111 11111111 11111111 11111111 11111101 11111111
    
    @AND
                             bitboards[0][0]:      00000000 11111111 00000000 00000000 00000000 00000000 00000000 00000000
    bitboards[0][0] &= ~(1n << BigInt(from)):      00000000 01111111 00000000 00000000 00000000 00000000 00000000 00000000
 

    @COMPORTAMENTO_DE_MEMORIA_PARA_ADICIONAR_PECA
 
    @TO 16 (h3)
 
         h g f e d c b a
 
    1    0 0 0 0 0 0 0 0
    2    0 0 0 0 0 0 0 0
    3    1 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    8    0 0 0 0 0 0 0 0
 
    @BITBOARD_PAWN_WHITE_POSICAO_8_REMOVIDA
 
         h g f e d c b a
 
    1    0 0 0 0 0 0 0 0
    2    0 1 1 1 1 1 1 1
    3    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    8    0 0 0 0 0 0 0 0

    @DESLOCAMENTO_A_ESQUERDA (Conversão da posição "to" para uma mascara de bits)
                         1n << BigInt(to):         00000000 00000000 10000000 00000000 00000000 00000000 00000000 00000000
 
    @OR
                          bitboards[0][0]:         00000000 01111111 00000000 00000000 00000000 00000000 00000000 00000000
    bitboards[0][0] |= (1n << BigInt(to)):         00000000 01111111 10000000 00000000 00000000 00000000 00000000 00000000
 
*/
function movePiece() {

    if (availableMoves & (1n << BigInt(toPosition))) {

        // Remove a posição original da peça
        bitboards[selectedColor][selectedPiece] &= ~(1n << BigInt(fromPosition));

        // Mascara de bits para a nova posição da peça
        let toMask = 1n << BigInt(toPosition);
        // Adiciona a nova posição da peça
        bitboards[selectedColor][selectedPiece] |= toMask;

        // Obtem a cor do oponente
        const OPPONENT_COLOR = selectedColor === WHITE ? BLACK : WHITE;

        // Iteração nas bitboards adversárias, para verificar se a peça adversária foi capturada
        for (let opponentPiece = 0; opponentPiece < 6; opponentPiece++) {
            bitboards[OPPONENT_COLOR][opponentPiece] &= ~toMask; // Remove a peça adversária
        }

        if (selectedPiece === PAWN) {

            // Obtem as peças adversárias
            const ALL_PIECES = allPiecesWhite | allPiecesBlack;

            const CAPTURE_LEFT = selectedColor === WHITE ? fromPosition - 9 : fromPosition + 9;
            const CAPTURE_RIGHT = selectedColor === WHITE ? fromPosition - 7 : fromPosition + 7;


            if ((enPassant !== null) && (toPosition === CAPTURE_LEFT && !(ALL_PIECES & (1n << BigInt(CAPTURE_LEFT)))) ||
                (toPosition === CAPTURE_RIGHT && !(ALL_PIECES & (1n << BigInt(CAPTURE_RIGHT))))) {
                bitboards[OPPONENT_COLOR][PAWN] &= ~(1n << BigInt(enPassant)); // remove peão marcado para captura en passant
            }

            // Verifica se o peão avançou duas casas em seu primeiro movimento
            if (Math.abs(fromPosition - toPosition) === 16) {
                // Obtem os peões adversários
                const OPPONENT_PAWNS = OPPONENT_COLOR === WHITE ? bitboards[WHITE][PAWN] : bitboards[BLACK][PAWN];
                // Verifica se o peão adversário está na posição correta para captura en passant
                if (OPPONENT_PAWNS & (1n << BigInt(toPosition - 1)) && toPosition > 24) {
                    enPassant = toPosition; // marca o peão que pode ser capturado en passant (para direita ou esquerda)
                }
                else if (OPPONENT_PAWNS & (1n << BigInt(toPosition + 1)) && toPosition < 39) {
                    enPassant = toPosition; // marca o peão que pode ser capturado en passant (para direita ou esquerda)
                }
                else {
                    enPassant = null; // desmarca o peão que pode ser capturado en passant
                }
            }
            else {
                enPassant = null;
            }
        }
    }
    else {
        alert("Movimento inválido!");
    }

}

function pieceToChar(piece, color) {
    const pieces = ["pawn", "knight", "bishop", "rook", "queen", "king"];
    return (color === WHITE ? "white_" : "black_") + pieces[piece];
}

// Função para renderizar o tabuleiro no HTML
function renderBoard() {
    const boardElement = document.getElementById("chessboard");
    boardElement.innerHTML = ""; // Limpa tabuleiro

    // Criação dos quadrados do tabuleiro
    // iteração das linhas
    for (let rank = 0; rank < 8; rank++) {
        let row = document.createElement("tr"); // table row
        // iteração das colunas
        for (let file = 0; file < 8; file++) {
            let square = document.createElement("td"); // table data
            square.className = (rank + file) % 2 === 0 ? "white" : "black"; // alternância de cores
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
    updateAllPieces();
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
    pieceDiv.className = `piece ${pieceToChar(piece, color)}`;
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

                    // Obtem o tipo da peça, a cor e a posição de origem
                    selectedPiece = piece;
                    selectedColor = color;
                    fromPosition = index;

                    // Marca a casa selecionado
                    event.currentTarget.classList.add("selected");

                    // Verifica os movimentos possíveis para a peça selecionada
                    switch (selectedPiece) {
                        case PAWN:
                            availableMoves = getPawnMoves();
                            return;
                        case ROOK:
                            availableMoves = getRookMoves();
                            break;
                        case KNIGHT:
                            availableMoves = getKnightMoves();
                            break;
                        case BISHOP:
                            availableMoves = getBishopMoves();
                            break;
                        case QUEEN:
                            availableMoves = getQueenMoves();
                            break;
                        case KING:
                            availableMoves = ~0n; // Implementação para teste
                            break;
                        default:
                            console.log("Peça não implementada");
                            break;
                    }
                    return;
                }
            }
        }
    } else { // Se não foi selecionada uma peça, então foi selecionado um quadrado de destino

        // Obtem a posição de destino
        toPosition = index;
        // Realiza o movimento da peça
        movePiece();

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


function getPawnMoves() {

    let bitboardMoves = 0n;

    // Variáveis comuns
    const OPPONENT_PIECES = selectedColor === WHITE ? allPiecesBlack : allPiecesWhite;
    const OWN_PIECES = selectedColor === WHITE ? allPiecesWhite : allPiecesBlack;
    const ADVANCE = selectedColor === WHITE ? -8n : 8n;
    const DOUBLE_ADVANCE = selectedColor === WHITE ? -16n : 16n;
    const START_ROWS = 0x00FF00000000FF00n;

    // Movimento de avanço simples
    let movement = 1n << (BigInt(fromPosition) + ADVANCE);
    // Verifica se a casa está vazia
    if (!(OPPONENT_PIECES & movement || (OWN_PIECES & movement))) {
        bitboardMoves |= movement;
    }

    // Movimento de avanço duplo
    movement = 1n << (BigInt(fromPosition) + DOUBLE_ADVANCE);
    // Verifica se o peão está nas linhas iniciais
    if (START_ROWS & (1n << BigInt(fromPosition))) {
        let middleSquare = 1n << (BigInt(fromPosition) + ADVANCE);
        // Verifica se a casa intermediaria e final estão vazias
        if (!(OPPONENT_PIECES & middleSquare || OWN_PIECES & middleSquare) && !(OPPONENT_PIECES & movement || OWN_PIECES & movement)) {
            bitboardMoves |= movement;
        }
    }

    // Movimentos de captura
    let captureLeft = selectedColor === WHITE ? ((1n << BigInt(fromPosition)) << -9n) : ((1n << BigInt(fromPosition)) << 9n);
    let captureRight = selectedColor === WHITE ? ((1n << BigInt(fromPosition)) << -7n) : ((1n << BigInt(fromPosition)) << 7n);

    // Verifica a captura para a esquerda
    if (captureLeft & OPPONENT_PIECES) {
        bitboardMoves |= captureLeft;
    }

    // Verifica a captura para a direita
    if (captureRight & OPPONENT_PIECES) {
        bitboardMoves |= captureRight;
    }

    // Movimento de captura en passant
    if (enPassant !== null) {

        // Posicoes laterais
        let p1 = selectedColor === WHITE ? fromPosition - 1 : fromPosition + 1;
        let p2 = selectedColor === WHITE ? fromPosition + 1 : fromPosition - 1;

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

function getRookMoves() {

    let bitboardMoves = 0n;
    const OPPONENT_PIECES = selectedColor === WHITE ? allPiecesBlack : allPiecesWhite;
    const OWN_PIECES = selectedColor === WHITE ? allPiecesWhite : allPiecesBlack;

    /**
            @EXEMPLO_DE_MOVIMENTO_TORRE_EM_H3
    
            hgfedcba
    
            00000000   1
            00000000   2
            10000000   3    => Rh3 (posição 16)
            00000000   4
            00000000   5
            00000000   6
            00000000   7
            00000000   8
    
            (1n << BigInt(16)) >>= 7n
    
            hgfedcba
    
            00000000   1                                                    
            00000000   2
            00000001   3    => Ra3 (posição 23)
            00000000   4
            00000000   5
            00000000   6
            00000000   7
            00000000   8
    
            (1n << BigInt(23)) <<= 1n
    
            hgfedcba
    
            00000000   1
            00000000   2
            00000010   3    => Rf3 (posição 22)
            00000000   4
            00000000   5
            00000000   6
            00000000   7
            00000000   8 
    */

    let movement;

    // Movimentos para a esquerda
    movement = 1n << BigInt(fromPosition);
    while (movement & NOT_A_FILE) {
        movement >>= 1n; // deslocamento para direita (diminui o valor binario)
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    // Movimentos para a direita
    movement = 1n << BigInt(fromPosition);
    while (movement & NOT_H_FILE) {
        movement <<= 1n; // deslocamento para esquerda (aumenta o valor binario)
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    // Movimentos para cima
    movement = 1n << BigInt(fromPosition);
    while (movement & NOT_1_RANK) {
        movement <<= 8n; // deslocamento para esquerda (aumenta o valor binario)
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    // Movimentos para baixo
    movement = 1n << BigInt(fromPosition);
    while (movement & NOT_8_RANK) {
        movement >>= 8n; // deslocamento para direita (diminui o valor binario)
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    return bitboardMoves;
}

function getKnightMoves() {
    let bitboardMoves = 0n;
    const OWN_PIECES = selectedColor === WHITE ? allPiecesWhite : allPiecesBlack;

    // 16 + 1 para baixo e 1 para direita
    // 16 - 1 para baixo e 1 para esquerda
    // 8 + 2 para baixo e 2 para direita
    // 8 - 2 para baixo e 2 para esquerda
    // -8 + 2 para cima e 2 para direita
    // -8 - 2 para cima e 2 para esquerda
    // -16 + 1 para cima e 1 para direita
    // -16 - 1 para cima e 1 para esquerda

    const knightMoves = [17, 15, 10, 6, -6, -10, -15, -17];

    for (let move of knightMoves) {
        // Calcula a posição do movimento
        let movement = fromPosition + move;
        // Verificação de borda para evitar saidas do tabuleiro
        if (movement >= 0 && movement < 64) {
            if (Math.abs((fromPosition % 8) - (movement % 8)) <= 2) {
                if (!(OWN_PIECES & (1n << BigInt(movement)))) {
                    bitboardMoves |= 1n << BigInt(movement);
                }
            }
        }
    }
    return bitboardMoves;
}

function getBishopMoves() {
    let bitboardMoves = 0n;
    const OPPONENT_PIECES = selectedColor === WHITE ? allPiecesBlack : allPiecesWhite;
    const OWN_PIECES = selectedColor === WHITE ? allPiecesWhite : allPiecesBlack;

    /**
    
    @BISPO_PRETO_EM_F3

         h g f e d c b a

    1    0 0 0 0 0 0 0 0
    2    0 0 0 0 0 0 0 0
    3    0 0 0 0 0 0 0 0
    4    0 0 0 0 0 0 0 0
    5    0 0 0 0 0 0 0 0
    6    0 0 0 0 0 0 0 0
    7    0 0 0 0 0 0 0 0
    8    0 0 1 0 0 0 0 0

    */

    let movement;
    // Movimentos para a diagonal superior esquerda do bitboard
    movement = 1n << BigInt(fromPosition);
    while (movement & (NOT_H_FILE & NOT_1_RANK)) {
        movement <<= 9n; // deslocamento para diagonal superior esquerda
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    // Movimentos para a diagonal superior direita do bitboard
    movement = 1n << BigInt(fromPosition);
    while (movement & (NOT_A_FILE & NOT_1_RANK)) {
        movement <<= 7n; // deslocamento para diagonal superior direita 
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    // Movimentos para a diagonal inferior esquerda do bitboard
    movement = 1n << BigInt(fromPosition);
    while (movement & (NOT_H_FILE & NOT_8_RANK)) {
        movement >>= 7n; // deslocamento para diagonal inferior esquerda
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }

    // Movimentos para a diagonal inferior direita do bitboard
    movement = 1n << BigInt(fromPosition);
    while (movement & (NOT_A_FILE & NOT_8_RANK)) {
        movement >>= 9n; // deslocamento para diagonal inferior direita
        if (movement & OWN_PIECES) break;
        bitboardMoves |= movement;
        if (movement & OPPONENT_PIECES) break;
    }
    return bitboardMoves;
}

function getQueenMoves() {
    return getRookMoves() | getBishopMoves();
}