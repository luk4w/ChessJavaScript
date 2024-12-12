# ChessJavaScript

ChessJavaScript é um jogo de xadrez com representação do tabuleiro a partir de bitboards. O projeto inclui funcionalidades como verificação de movimentos, promoção de peões, geração de notação FEN e PGN para registrar os movimentos e integração com o Stockfish.

[![Chess Java Script](https://github.com/user-attachments/assets/d61a1c4a-28e2-4ce3-b7b6-5e0e367237ea)](https://luk4w.github.io/ChessJavaScript/)

### 🛠️ Características

- **Bitboards**: Utiliza números inteiros de 64 bits para representar as peças no tabuleiro, máscaras de ataque e defesa.
- **Regras:** Possui verificação de movimentos válidos, xeque, empate, xeque-mate, en passant e roque.
- **Promoção de Peão:** Renderiza de forma dinâmica as opções de promoção (inspirado no Lichess).
- **Notação:** Converte os movimentos realizados e os metadados do jogo para o formato PGN e FEN, para salvar e compartilhar as partidas.
- **Interface:** Tabuleiro e peças com suporte para clique esquerdo para exibir os movimentos das peças e clique direito para marcar as casas do tabuleiro.
- **Audio:** Efeitos sonoros para diferentes eventos do jogo, como movimentos de peças, xeque, captura, roque, xeque-mate e empate, além de feedback para movimentos inválidos.
- **Stockfish:** Integração com o Stockfish, permite jogar contra o computador.

### 📈 Últimas Atualizações

- **Suporte a formatos de PGN adicionais**: Formatos simplificados com designação de linha ou coluna (ex: Nbd7, R1e2).
- **Melhorias na estrutura do código**: Funções que recebem o estado do jogo como parâmetro para maior modularidade.
- **Interface Aprimorada**: Marcação da última jogada realizada.
- **Otimização**: Refinamento das funções de movimentação e verificação de regras para aumentar a eficiência do código.

### 🚀 Jogue no Navegador

Você pode jogar ChessJavaScript diretamente em seu navegador contra o computador, basta acessar [ChessJavaScript](https://luk4w.github.io/ChessJavaScript/)

### 💾 Clonar repositório

Para clonar esse repositório utilize o seguinte comando git:

```bash
   git clone https://github.com/luk4w/ChessJavaScript.git
```
