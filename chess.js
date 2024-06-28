/**
    @Autor Lucas Franco de Mello
    @Description Implementação de um jogo de xadrez com bitboards em JavaScript
    @Date 2024-06-27
*/

// Inicializa o Stockfish
var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
var stockfish = new Worker(wasmSupported ? './engine/stockfish.wasm.js' : './engine/stockfish.js');
stockfish.addEventListener('message', function (e) {
    console.log(e.data);
});
stockfish.postMessage('uci');

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

let selectedPiece = null;
let selectedColor = null;
let selectedPosition = null;

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

function movePiece(color, piece, from, to) {

    // Verificar se o movimento é válido
    if (!isValidMove(color, piece, from, to)) {
        alert('Movimento inválido!');
        return;
    }

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

    // Remove a posição original da peça
    bitboards[color][piece] &= ~(1n << BigInt(from));

    // Mascara de bits para a nova posição da peça
    let toMask = 1n << BigInt(to);
    // Adiciona a nova posição da peça
    bitboards[color][piece] |= toMask;

    // Obtem a cor do oponente
    let opponentColor = color === WHITE ? BLACK : WHITE;

    // Iteração nas bitboards adversárias, para verificar se a peça adversária foi capturada
    for (let opponentPiece = 0; opponentPiece < 6; opponentPiece++) {
        bitboards[opponentColor][opponentPiece] &= ~toMask;
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

    if (selectedPiece === null) {
        for (let color = 0; color < 2; color++) {
            for (let piece = 0; piece < 6; piece++) {
                if (bitboards[color][piece] & (1n << BigInt(index))) {
                    selectedPiece = piece;
                    selectedColor = color;
                    selectedPosition = index;
                    event.currentTarget.classList.add("selected");
                    return;
                }
            }
        }
    } else {
        // Mover a peça selecionada
        movePiece(selectedColor, selectedPiece, selectedPosition, index);
        selectedPiece = null;
        selectedColor = null;
        selectedPosition = null;
        document.querySelectorAll(".selected").forEach(cell => cell.classList.remove("selected"));
        renderBoard();
    }
}

// Inicializa o tabuleiro e renderiza
initializeBoard();
renderBoard();


// Função para verificar se o movimento é válido
function isValidMove(color, piece, from, to) {
    let isValid = false;
    switch (piece) {
        case PAWN:
            isValid = isValidPawnMove(color, from, to);
            break;
        case KNIGHT:
            isValid = isValidKnightMove(from, to);
            break;
        case BISHOP:
            isValid = isValidBishopMove(from, to);
            break;
        case ROOK:
            isValid = isValidRookMove(from, to);
            break;
        case QUEEN:
            isValid = isValidQueenMove(from, to);
            break;
        case KING:
            isValid = isValidKingMove(from, to);
            break;
        default:
            return false;
    }

    if (!isValid) {
        return false;
    }

    // Também é necessario verificar se o movimento é ilegal, ou seja, se o rei está em cheque
    // Para isso, é necessário simular o movimento e verificar se o rei está em cheque
    
    return isValid;
}

function isValidPawnMove(color, from, to) {

    if (color === WHITE) {
        // Verifica se a casa de destino está ocupada por uma peça branca
        if (ALL_PIECES_WHITE & (1n << BigInt(to))) {
            return false;
        }

        // Movimento de avanço simples
        if (from - 8 === to && !(ALL_PIECES_BLACK & (1n << BigInt(to)))) {
            return true;
        }

        // Movimento de avanço duplo
        if (from - 16 === to && (from >= 48 && from <= 55) && !(ALL_PIECES_BLACK & (1n << BigInt(to)))) {

            let middleSquare = from - 8;
            // Verifica se há alguma peça (branca ou preta) na posição intermediária
            if (ALL_PIECES_BLACK & (1n << BigInt(middleSquare)) || ALL_PIECES_WHITE & (1n << BigInt(middleSquare))) {
                return false;
            }
            return true;
        }

        // Movimento de captura
        if (ALL_PIECES_BLACK & (1n << BigInt(to)) && (from - 7 === to || from - 9 === to)) {
            return true;
        }
    }
    else if (color === BLACK) {
        // Verifica se a casa de destino está ocupada por uma peça preta
        if (ALL_PIECES_BLACK & (1n << BigInt(to))) {
            return false;
        }

        // Movimento de avanço simples
        if (from + 8 === to && !(ALL_PIECES_WHITE & (1n << BigInt(to)))) {
            return true;
        }

        // Movimento de avanço duplo
        if (from + 16 === to && (from >= 8 && from <= 15) && !(ALL_PIECES_WHITE & (1n << BigInt(to)))) {

            let middleSquare = from + 8;
            // Verifica se há alguma peça (branca ou preta) na posição intermediária
            if (ALL_PIECES_BLACK & (1n << BigInt(middleSquare)) || ALL_PIECES_WHITE & (1n << BigInt(middleSquare))) {
                return false;
            }
            return true;
        }

        // Movimento de captura
        if (ALL_PIECES_WHITE & (1n << BigInt(to)) && (from + 7 === to || from + 9 === to)) {
            return true;
        }
    }

    return false;
}

function isValidKnightMove(from, to) {
    return true;
}

function isValidBishopMove(from, to) {
    return true;
}

function isValidRookMove(from, to) {
    return true;
}

function isValidQueenMove(from, to) {
    return true;
}

function isValidKingMove(from, to) {
    return true;
}