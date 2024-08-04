import Game from "./game.js";
var wasmSupported = typeof WebAssembly === 'object' && WebAssembly.validate(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
var stockfish = new Worker(wasmSupported ? '../stockfish/stockfish.wasm.js' : '../stockfish/stockfish.js');
const game = new Game(wasmSupported, stockfish);