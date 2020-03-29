"use strict";


export class InvalidActionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidActionError';
    }
}


class InvalidChar extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidChar';
    }
}


class InvalidBoardSize extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidBoardSize';
    }
}


/**
 * Class to store state and handle the game logic of tic-tac-toe.
 */
export class TicTacToe {
    /**
     * Instantiate a TicTacToe object.
     * 
     * @param {string} [nll='_'] Represents an empty element of state. Must be a single character.
     * @param {iterable(elements)} [buttons=null] An iterable over button elements for game board.
     */
    constructor(nll='_', buttons=null) {
        if (nll.length != 1) {
            throw new InvalidChar(`Parameter nll must have length 1 but has length ${nll.length}.`);
        }
        
        this.nll = nll;
        this.state = [
            this.nll, this.nll, this.nll,
            this.nll, this.nll, this.nll,
            this.nll, this.nll, this.nll,
        ];
        this.currentPlayer = 'X';
        this.stateHistory = [this.state.slice()];
        this.actionHistory = [];

        if (buttons) {
            if (buttons.length != 9) {
                throw new InvalidBoardSize(`buttons must have length 9 but has length ${buttons.length}`);
            }
            for (let button of buttons) {
                button.innerHTML = "&nbsp;"
                button.disabled = false;
            }
            this.buttons = buttons;
        } else {
            this.buttons = null;
        }
    }

    /**
     * Unroll a pair of row and column indices into a single index.
     * 
     * @param {number} row Row index from top of board to bottom of board.
     * @param {number} col Column index from left of board to right of board.
     * @return {number} Single index for accessing state array.
     */
    static unroll(row, col) {
        return row * 3 + col;
    }

    /**
     * Roll an index into a pair of row and column indices.
     * 
     * @param {number} index Index to be converted to row and column.
     * @return {Object} An object with row and col fields.
     */
    static roll(index) {
        const row = Math.floor(index / 3);
        const col = index % 3;
        return {row, col};
    }

    /**
     * Convert an action index to a 9 element array.
     * 
     * @param {number} index Index of action element.
     * @param {string} [placeholder='A'] Fill element with this string.
     * @param {string|null} [empty=null] Used to fill empty elements.
     * @return {Array(string)} Index converted into an array.
     */
    static toActionArray(index, placeholder='A', empty=null) {
        let actionArray = [
            empty, empty, empty,
            empty, empty, empty,
            empty, empty, empty,
        ];
        actionArray[index] = placeholder;
        return actionArray;
    }

    /**
     * Convert an action array to an index.
     * 
     * @param {Array(string)} actionArray Array with one elemnt not equal to empty.
     * @param {string|null} [empty=null] Indicates an empty element.
     * @return {number|null} Number of the first element not equal to empty. If not found, returns
     *     null.
     */
    static toActionIndex(actionArray, empty=null) {
        for (let [index, elem] of actionArray.entries()) {
            if (elem != empty) {
                return index;
            }
        }
        return null;
    }

    /**
     * Rotates a game state by 90 degrees clockwise.
     * 
     * @param {Array(string)} state A game state.
     * @param {number} n The number of 90 degree rotations.
     * @return {Array{string}} state rotated by n * 90 degrees.
     */
    static rot90(state, n) {
        let newState = [];
        if (n % 4 === 0) {
            return state;
        }
        else if (n % 4 === 1) {
            newState.push(
                state[6], state[3], state[0],
                state[7], state[4], state[1],
                state[8], state[5], state[2],
            );
        } else if (n % 4 === 2) {
            newState.push(
                state[8], state[7], state[6],
                state[5], state[4], state[3],
                state[2], state[1], state[0],
            );
        } else if (n % 4 === 3) {
            newState.push(
                state[2], state[5], state[8],
                state[1], state[4], state[7],
                state[0], state[3], state[6],
            )
        }
        return newState;
    }

    /**
     * Mirror a state across its vertical axis.
     * 
     * @param {Array(string)} state A game state.
     * @return {Array(string)} Mirrored version of state.
     */
    static mirror(state) {
        let newState = new Array(9);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                newState[TicTacToe.unroll(i, 2 - j)] = state[TicTacToe.unroll(i, j)];
            }
        }
        return newState;
    }

    /**
     * Add a piece to the game board.
     * 
     * @param {number} index The index of the board to update. See 
     *     "TicTacToe.unroll()" for more information.
     */
    move(index) {
        // Verify the index is valid.
        if (index >= 9 || index < 0) {
            throw new InvalidActionError(`Position ${index} must be in [0, 9) exclusive.`);
        } else if (this.state[index] != this.nll) {
            throw new InvalidActionError(`Invalid move! Position ${index} is already taken.`);
        } else if (this.checkTermination()) {
            throw new InvalidActionError(`Game is already complete!`);
        }

        // Index is valid; add a piece to the game board.
        this.state[index] = this.currentPlayer;

        if (this.buttons) {
            this.buttons[index].innerText = this.currentPlayer;
            this.buttons[index].disabled = true;
            if (this.checkTermination()) {
                for (let button of this.buttons) {
                    button.disabled = true;
                }
            }
        }

        // Switch to the other player.
        if (this.currentPlayer == 'X') {
            this.currentPlayer = 'O';
        } else {
            this.currentPlayer = 'X';
        }

        // Update the state and action history.
        this.actionHistory.push(index);
        this.stateHistory.push(this.state.slice());
    }

    /**
     * Check whether the game has completed and who has won, if anyone.
     * 
     * @return {string} From 'X', 'O', 'draw', or ''.
     */
    checkTermination() {
        // Initialize diagonal win indicators.
        let tlX = true;
        let trX = true;
        let tlO = true;
        let trO = true;

        // Initialize draw game indicator.
        let draw = true;

        for (let i = 0; i < 3; i++) {
            // For the ith row and column, initialize row and column win indicators.
            let rowX = true;
            let colX = true;
            let rowO = true;
            let colO = true;

            // Check ith element diagonally from top-left to bottom-right.
            let index = TicTacToe.unroll(i, i);
            if (this.state[index] != 'X') {
                tlX = false;
            }
            if (this.state[index] != 'O') {
                tlO = false;
            }

            // Check ith element diagonally from top-right to bottom-left.
            index = TicTacToe.unroll(i, 2 - i);
            if (this.state[index] != 'X') {
                trX = false;
            }
            if (this.state[index] != 'O') {
                trO = false;
            }

            for (let j = 0; j < 3; j++) {
                // Check the jth column of the ith row.
                let index = TicTacToe.unroll(i, j);
                if (this.state[index] != 'X') {
                    rowX = false;
                }
                if (this.state[index] != 'O') {
                    rowO = false;
                }

                // If there are any empty indices of state, this cannot be a draw game.
                if (this.state[index] == this.nll) {
                    draw = false;
                }

                // Check the jth row of the ith column.
                index = TicTacToe.unroll(j, i);
                if (this.state[index] != 'X') {
                    colX = false;
                }
                if (this.state[index] != 'O') {
                    colO = false;
                }
            }

            // Check if there is a winner along the ith row or column.
            if (rowX || colX) {
                return 'X';
            } else if (rowO || colO) {
                return 'O';
            }
        }
        // Check for a winner along the diagonals.
        if (tlX || trX) {
            return 'X';
        } else if (tlO || trO) {
            return 'O';
        }

        if (draw) {
            // All elements occupied, game is a draw.
            return 'draw';
        } else {
            // No winner and empty elements; the game continues.
            return '';
        }
    }

    /**
     * Get the current valid actions that may be taken given the state of the game.
     * 
     * @return {Array(number)} Indices of valid actions.
     */
    getValidActions() {
        let valid = [];
        for (let i = 0; i < 9; i++) {
            if (this.state[i] == this.nll) {
                valid.push(i);
            }
        }
        return valid;
    }

    /**
     * Get a string representing the current game state.
     * 
     * @return {string} Visualization of the game state.
     */
    toString() {
        let rows = [];
        for (let i = 0; i < 3; i++) {
            let row = [];
            for (let j = 0; j < 3; j++) {
                let index = TicTacToe.unroll(i, j);
                if (this.state[index] == this.nll) {
                    row.push(' ');
                } else {
                    row.push(this.state[index]);
                }
            }
            rows.push(row.join('|') + '\n');
        }
        return rows.join('-----\n');
    }

    /**
     * Print a visualization of the current game state to console.
     */
    printState() {
        console.log(this.toString());
    }

    /**
     * Start a new game.
     */
    reset() {
        this.state = [
            this.nll, this.nll, this.nll,
            this.nll, this.nll, this.nll,
            this.nll, this.nll, this.nll,
        ];
        this.stateHistory = [this.state.slice()];
        this.actionHistory = [];
        this.currentPlayer = 'X';

        if (this.buttons) {
            if (this.buttons.length != 9) {
                throw new InvalidBoardSize(`buttons must have length 9 but has length ${buttons.length}`);
            }
            for (let button of this.buttons) {
                button.innerHTML = "&nbsp;"
                button.disabled = false;
            }
        }
    }
}