/**
 * Compute only a terminal reward. If player wins, reward is 1; if
 * loses, reward is -1; and otherwise 0. All rewards for non-terminal
 * states are 0.
 * 
 * @param {TicTacToe} game An instantiation of TicTacToe. 
 * @param {string} player Player token from 'X' and 'O'.
 */
export function terminalOnly(game, player) {
    let outcome = game.checkTermination();
    if (outcome == player) {
        return 1.0;
    } else if (outcome == 'draw' || !outcome) {
        return 0.0;
    } else {
        return -1.0;
    }
}