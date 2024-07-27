# [ChessJavaScript](https://luk4w.github.io/ChessJavaScript/)

ChessJavaScript é um jogo de xadrez com representação do tabuleiro a partir de bitboards. O projeto inclui funcionalidades como verificação de movimentos, promoção de peões e geração de notação FEN e PGN para registrar os movimentos.

## Características
- **Bitboards**: Utiliza números inteiros de 64 bits para representar as peças no tabuleiro, máscaras de ataque e defesa.
- **Regras:** Possui verificação de movimentos válidos, xeque, empate, xeque-mate, en passant e roque.
- **Promoção de Peão:** Renderiza de forma dinâmica as opções de promoção (inspirado no Lichess).
- **Notação:** Converte os movimentos realizados e os metadados do jogo para o formato PGN e FEN, para salvar e compartilhar as partidas.
- **Interface:** Tabuleiro e peças com suporte para clique esquerdo para exibir os movimentos das peças e clique direito para marcar as casas do tabuleiro.
- **Audio:** Efeitos sonoros para diferentes eventos do jogo, como movimentos de peças, xeque, captura, roque, xeque-mate e empate, além de feedback para movimentos inválidos.
- **Stockfish:** Integração com o Stockfish, permite jogar contra o computador.

##  Últimas Atualizações
- Suporte a outros formatos de PGN: formatos simplificados com designação de linha ou coluna (ex: Nbd7 R1e2).
- Melhorias na estrutura: funções que recebem o estado do jogo como parâmetro.
- Interface: Adicionada a marcação da última jogada realizada.
- Otimização: Refinamento de funções de movimentação e verificação de regras para aumentar a eficiência do código.