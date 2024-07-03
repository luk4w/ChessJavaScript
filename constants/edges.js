export const NOT_A_FILE = 0x7F7F7F7F7F7F7F7Fn; // Máscara para eliminar a coluna A
export const NOT_H_FILE = 0xFEFEFEFEFEFEFEFEn; // Máscara para eliminar a coluna H
export const NOT_1_RANK = 0xFFFFFFFFFFFFFF00n; // Máscara para eliminar a linha 1
export const NOT_8_RANK = 0x00FFFFFFFFFFFFFFn; // Máscara para eliminar a linha 8

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