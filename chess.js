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
    00000000 11111111 00000000 00000000 00000000 00000000 00000000 00000000
    
    HEX:
    0x00FF000000000000

    Exemplo de bitboard para os peões pretos:


    MENOS SIGNIFICATIVO ->  0 0 0 0 0 0 0 0 
                            1 1 1 1 1 1 1 1
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0
                            0 0 0 0 0 0 0 0  <- MAIS SIGNIFICATIVO

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

let ALL_PIECES_BLACK = 0n;
let ALL_PIECES_WHITE = 0n;
let avalaibleMoves = 0n;

let selectedPiece = null;
let selectedColor = null;
let fromPosition = null;
let toPosition = null;

let enPassant = null;

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
    ALL_PIECES_BLACK = bitboards[BLACK][PAWN] | bitboards[BLACK][KNIGHT] | bitboards[BLACK][BISHOP] |
        bitboards[BLACK][ROOK] | bitboards[BLACK][QUEEN] | bitboards[BLACK][KING];

    ALL_PIECES_WHITE = bitboards[WHITE][PAWN] | bitboards[WHITE][KNIGHT] | bitboards[WHITE][BISHOP] |
        bitboards[WHITE][ROOK] | bitboards[WHITE][QUEEN] | bitboards[WHITE][KING];
}

function movePiece() {

    /** 
        @COMPORTAMENTO_DE_MEMORIA_PARA_REMOVER_PECA
    
        @FROM 8 (posição)
    
             a b c d e f g h
    
        8    0 0 0 0 0 0 0 0
        7    0 0 0 0 0 0 0 0
        6    0 0 0 0 0 0 0 0
        5    0 0 0 0 0 0 0 0
        4    0 0 0 0 0 0 0 0
        3    0 0 0 0 0 0 0 0
        2    0 0 0 0 0 0 0 1
        1    0 0 0 0 0 0 0 0
    
    
        @BITBOARD_PAWN_WHITE
    
             a b c d e f g h
    
        8    0 0 0 0 0 0 0 0
        7    0 0 0 0 0 0 0 0
        6    0 0 0 0 0 0 0 0
        5    0 0 0 0 0 0 0 0
        4    0 0 0 0 0 0 0 0
        3    0 0 0 0 0 0 0 0
        2    1 1 1 1 1 1 1 1
        1    0 0 0 0 0 0 0 0
    
                                 bitboards[0][0]:      00000000 11111111 00000000 00000000 00000000 00000000 00000000 00000000 
                                            from:      8
    
        @DESLOCAMENTO_A_ESQUERDA (Conversão da posição "from" para uma mascara de bits)
                              1n << BigInt(from):      00000000 10000000 00000000 00000000 00000000 00000000 00000000 00000000 
    
        @NOT
                           ~(1n << BigInt(from)):      11111111 01111111 11111111 11111111 11111111 11111111 11111101 11111111
        
        @AND
                                 bitboards[0][0]:      00000000 11111111 00000000 00000000 00000000 00000000 00000000 00000000
        bitboards[0][0] &= ~(1n << BigInt(from)):      00000000 01111111 00000000 00000000 00000000 00000000 00000000 00000000
    

        @COMPORTAMENTO_DE_MEMORIA_PARA_ADICIONAR_PECA
    
        @TO 16 (posição)
    
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
                             1n << BigInt(to):         00000000 00000000 10000000 00000000 00000000 00000000 00000000 00000000
    
        @OR
                              bitboards[0][0]:         00000000 01111111 00000000 00000000 00000000 00000000 00000000 00000000
        bitboards[0][0] |= (1n << BigInt(to)):         00000000 01111111 10000000 00000000 00000000 00000000 00000000 00000000
    
    */

    if (avalaibleMoves & (1n << BigInt(toPosition))) {

        // Remove a posição original da peça
        bitboards[selectedColor][selectedPiece] &= ~(1n << BigInt(fromPosition));

        // Mascara de bits para a nova posição da peça
        let toMask = 1n << BigInt(toPosition);
        // Adiciona a nova posição da peça
        bitboards[selectedColor][selectedPiece] |= toMask;

        // Obtem a cor do oponente
        let opponentColor = selectedColor === WHITE ? BLACK : WHITE;

        // Iteração nas bitboards adversárias, para verificar se a peça adversária foi capturada
        for (let opponentPiece = 0; opponentPiece < 6; opponentPiece++) {
            bitboards[opponentColor][opponentPiece] &= ~toMask; // Remove a peça adversária
        }

        if (selectedPiece === PAWN) {
            // Verifica se o peão avançou duas casas em seu primeiro movimento
            if (Math.abs(fromPosition - toPosition) === 16) {

                // Obtem os peões adversários
                let OPPONENT_PAWNS = opponentColor === WHITE ? bitboards[WHITE][PAWN] : bitboards[BLACK][PAWN];

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

    console.log("En passant Position: " + enPassant);

}

function pieceToChar(piece, color) {
    const pieces = ["pawn", "knight", "bishop", "rook", "queen", "king"];
    return (color === WHITE ? "white_" : "black_") + pieces[piece];
}

// Função para renderizar o tabuleiro no HTML
function renderBoard() {
    const boardElement = document.getElementById("chessboard");
    boardElement.innerHTML = ""; // Limpa tabuleiro

    // Criação das células do tabuleiro
    // iteração das linhas
    for (let rank = 0; rank < 8; rank++) {
        let row = document.createElement("tr"); // table row
        // iteração das colunas
        for (let file = 0; file < 8; file++) {
            let cell = document.createElement("td"); // table data
            cell.className = (rank + file) % 2 === 0 ? "white" : "black"; // alternância de cores
            const index = rank * 8 + file; // index do quadrado
            cell.dataset.index = index; // armazena o index do quadrado
            cell.addEventListener("click", handleCellClick); // adiciona o evento de clique
            row.appendChild(cell); // adiciona a calula a linha
        }
        boardElement.appendChild(row); // adiciona a linha ao tabuleiro
    }

    // Atualização das peças no tabuleiro
    updatePiecesOnBoard();
}

// Função para atualizar todas as peças no tabuleiro
function updatePiecesOnBoard() {
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
                    addPieceToCell(i, piece, color); // Adiciona a peça ao tabuleiro
                }
            }
        }
    }
    updateAllPieces();
}

// Função para adicionar uma peça na célula
function addPieceToCell(index, piece, color) {
    const boardElement = document.getElementById("chessboard");
    const cell = boardElement.querySelector(`[data-index="${index}"]`);

    // Remove qualquer peça existente na célula
    cell.innerHTML = "";

    // Cria o elemento da peça
    const pieceDiv = document.createElement("div");
    pieceDiv.className = `piece ${pieceToChar(piece, color)}`;
    cell.appendChild(pieceDiv);
}



// Função para lidar com o clique em uma célula
function handleCellClick(event) {
    const index = parseInt(event.currentTarget.dataset.index);

    if (fromPosition === null) {
        for (let color = 0; color < 2; color++) {
            for (let piece = 0; piece < 6; piece++) {
                if (bitboards[color][piece] & (1n << BigInt(index))) {
                    selectedPiece = piece; // Obtem o tipo da peça
                    selectedColor = color; // Obtem a cor da peça selecionada
                    fromPosition = index; // Obtem a posição de origem
                    console.log(`${pieceToChar(selectedPiece, selectedColor)} ; ${fromPosition}`);

                    event.currentTarget.classList.add("selected"); // Marca o quadrado selecionado
                    return;
                }
            }
        }
    } else {
        // Verifica os movimentos possíveis para a peça selecionada
        switch (selectedPiece) {
            case PAWN:
                avalaibleMoves = getPawnMoves();
                break;
            case ROOK:
                avalaibleMoves = ~0n; // Implementação para teste
                break;
            case KNIGHT:
                avalaibleMoves = ~0n; // Implementação para teste
                break;
            case BISHOP:
                avalaibleMoves = ~0n; // Implementação para teste
                break;
            case QUEEN:
                avalaibleMoves = ~0n; // Implementação para teste
                break;
            case KING:
                avalaibleMoves = ~0n; // Implementação para teste
                break;
            default:
                console.log("Peça não implementada");
                break;
        }

        toPosition = index; // Obtem a posição de destino antes de mover a peça
        movePiece(); // Move a peça

        // Atualiza as variáveis para o próximo movimento
        fromPosition = null;
        selectedColor = null;
        toPosition = null;
        avalaibleMoves = 0n;

        document.querySelectorAll(".selected").forEach(cell => cell.classList.remove("selected")); // Remove a marcação do quadrado selecionado
        renderBoard(); // Renderiza as novas posições das peças
    }
}

// Inicializa o tabuleiro e renderiza
initializeBoard();
renderBoard();


function getPawnMoves() {

    let bitboardMoves = 0n;

    // Variáveis comuns
    const opponentPieces = selectedColor === WHITE ? ALL_PIECES_BLACK : ALL_PIECES_WHITE;
    const ownPieces = selectedColor === WHITE ? ALL_PIECES_WHITE : ALL_PIECES_BLACK;
    const advance = selectedColor === WHITE ? -8 : 8;
    const doubleAdvance = selectedColor === WHITE ? -16 : 16;
    const startRow = selectedColor === WHITE ? (fromPosition >= 48 && fromPosition <= 55) : (fromPosition >= 8 && fromPosition <= 15);
    const captureLeft = selectedColor === WHITE ? -7 : 7;
    const captureRight = selectedColor === WHITE ? -9 : 9;

    // Movimento de avanço simples
    let movement = fromPosition + advance;
    if (!(opponentPieces & (1n << BigInt(movement)) || (ownPieces & (1n << BigInt(movement))))) {
        bitboardMoves |= 1n << BigInt(movement);
    }

    // Movimento de avanço duplo
    movement = fromPosition + doubleAdvance;
    if (startRow && !(opponentPieces & (1n << BigInt(movement)) || ownPieces & (1n << BigInt(movement)))) {
        let middleSquare = fromPosition + advance;
        // Verifica se a casa intermediária está vazia
        if (!(opponentPieces & (1n << BigInt(middleSquare)) || ownPieces & (1n << BigInt(middleSquare)))) {
            bitboardMoves |= 1n << BigInt(movement);
        }
    }

    // Movimento de captura
    movement = fromPosition + captureLeft;
    if (opponentPieces & (1n << BigInt(movement))) {
        bitboardMoves |= 1n << BigInt(movement);
    }

    movement = fromPosition + captureRight;
    // Verifica se a peça adversária está na posição de captura
    if (opponentPieces & (1n << BigInt(movement))) {
        bitboardMoves |= 1n << BigInt(movement);
    }

    // Movimento de captura en passant
    if (enPassant !== null) {

        // Posicoes laterais
        let s1 = selectedColor === WHITE ? fromPosition - 1 : fromPosition + 1;
        let s2 = selectedColor === WHITE ? fromPosition + 1 : fromPosition - 1;

        // se a posição lateral s1 for igual a do peão marcado para captura en passant
        if (s1 === enPassant) {
            // captura no vazio para a direita
            movement = fromPosition + captureRight;
            bitboardMoves |= 1n << BigInt(movement);
        }
        // se a posição lateral s2 for igual a do peão marcado para captura en passant
        else if (s2 === enPassant) {
            // captura no vazio para a esquerda
            movement = fromPosition + captureLeft;
            bitboardMoves |= 1n << BigInt(movement);
        }
    }

    return bitboardMoves;
}