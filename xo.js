import { TicTacToe } from './game.js';
import { RandomAgent, MonteCarloAgent, QLearningAgent } from './agent.js';
import { terminalOnly } from './rewards.js';
import { disableLogging } from './logger.js';


// Convert grid button id to a state array index.
const idToIndex = new Map(Object.entries({
    topLeft:      0,
    topCenter:    1,
    topRight:     2,
    centerLeft:   3,
    centerCenter: 4,
    centerRight:  5,
    bottomLeft:   6,
    bottomCenter: 7,
    bottomRight:  8,
}));


// Convert a state array index into a button id.
const indexToId = new Map(function() {
    let keyValue = [];
    for (let [key, value] of idToIndex.entries()) {
        keyValue.push([value, key]);
    }
    return keyValue;
}());


/**
 * Encapsulate the control flow of a series of episodes of tic-tac-toe.
 */
class GameHandler {
    /**
     * Instantiate a GameHandler.
     * 
     * @param {TicTacToe} game A TicTacToe instance.
     * @param {string} playerChoice The player's (user's) game token from 'X' and 'O'.
     * @param {Agent} agent An Agent instance (see MonteCarloAgent for an example). 
     * @param {function} rewardFunc Reward function that takes in game and player and
     *     returns a numeric reward.
     */
    constructor(game, playerChoice, agent, rewardFunc) {
        this.game = game;
        this.playerChoice = playerChoice;
        this.agent = agent;
        this.rewardFunc = rewardFunc;

        if (this.agent instanceof MonteCarloAgent || this.agent instanceof QLearningAgent) {
            // For MonteCarloAgent or QLearningAgent, pull and store epsilon and discount 
            // hyperparameters.
            let epsilonField = document.getElementById('epsilonGreedy');
            let epsilon = epsilonField.value;
            if (!isNaN(epsilon) && Number(epsilon) >= 0.0 && Number(epsilon) <= 1.0) {
                this.agent.epsilon = Number(epsilon);
            } else {
                epsilon = 0.0;
                epsilonField.value = epsilon;
            }

            let discountField = document.getElementById('discountFactor');
            let discount = discountField.value;
            if (!isNaN(discount) && Number(discount) >= 0.0 && Number(discount) <= 1.0) {
                this.agent.discount = Number(discount);
            } else {
                discount = 1.0;
                discountField.value = discount;
            }

            if (this.agent instanceof QLearningAgent) {
                // For QLearningAgent, pull and store the learning rate (alpha).
                let alphaField = document.getElementById('alphaLearn');
                let alpha = alphaField.value;
                if (!isNaN(alpha) && Number(alpha) >= 0.0) {
                    this.agent.alpha = Number(alpha);
                } else {
                    alpha = 0.1;
                    alphaField.value = alpha;
                }
            }
        }
    }

    /**
     * Player (user) makes a move when selecting a button.
     * 
     * @param {string} buttonId The id of a grid button (see idToIndex). 
     */
    playerMove(buttonId) {
        const index = idToIndex.get(buttonId);
        this.game.move(index);
    }

    /**
     * Computer makes a move using the agent's policy.
     */
    computerMove() {
        const index = this.agent.policy(this.game);
        this.game.move(index);
    }

    /**
     * When the player (user) selects a grid button, a bout of the game plays out where the
     * computer gets a follow-up move (if the game has not terminated). The computer is also
     * given the option to learn as the game progresses. The game is reset at termination.
     * 
     * @param {string} buttonId The id of a grid button (see idToIndex). 
     */
    moveSequence(buttonId) {
        // Player makes a move.
        this.playerMove(buttonId);

        if (this.game.actionHistory.length > 1) {
            // Learning cannot occur util after the player and computer have both moved at
            // least once.
            this.agent.learn(this.game, this.rewardFunc);
        }

        let outcome = this.game.checkTermination();
        if (outcome) {
            // Player finished the game. Enable the reset button.
            this.enableReset();
        } else {
            // Computer makes a move.
            this.computerMove();

            outcome = this.game.checkTermination();
            if (outcome) {
                // Computer finished the game. Learn and enable the reset button.
                this.agent.learn(
                    this.game, 
                    this.rewardFunc, 
                );
                this.enableReset();
            }
        }
    }

    /**
     * Store an iterable of grid button elements.
     * 
     * @param {iterable(elements)} buttons An iterable over button elements for game board.
     */
    setGrid(buttons) {
        this.game.buttons = buttons;
    }

    /**
     * Store the reset button element.
     * 
     * @param {element} button The reset button element.
     */
    setReset(button) {
        this.resetButton = button;
        this.disableReset();
    }

    /**
     * Enable the reset button (clickable).
     */
    enableReset() {
        this.resetButton.disabled = false;
    }

    /**
     * Disable the reset button (unclickable).
     */
    disableReset() {
        this.resetButton.disabled = true;
    }

    /**
     * Reset the game (start a fresh game).
     */
    resetGame() {
        // Disable the reset button and reset the game.
        this.disableReset();
        this.game.reset();

        if (Math.random() < 0.5) {
            // Player (user) is 'O' in the next game.
            this.playerChoice = 'O';
            this.agent.player = 'X';
            this.computerMove();
        } else {
            // Player (user) is 'X' in the next game.
            this.playerChoice = 'X';
            this.agent.player = 'O';
        }
    }

    /**
     * Update the hyperparameters of the agent by pulling values from fields.
     */
    updateParams() {
        if (this.agent instanceof MonteCarloAgent || this.agent instanceof QLearningAgent) {
            // Pull in any new values for the epsilon and discount hyperparameters.
            let epsilonField = document.getElementById('epsilonGreedy');
            let epsilon = epsilonField.value;
            if (!isNaN(epsilon) && Number(epsilon) >= 0.0 && Number(epsilon) <= 1.0) {
                this.agent.epsilon = Number(epsilon);
            } else {
                epsilon = this.agent.epsilon;
                epsilonField.value = epsilon;
            }

            let discountField = document.getElementById('discountFactor');
            let discount = discountField.value;
            if (!isNaN(discount) && Number(discount) >= 0.0 && Number(discount) <= 1.0) {
                this.agent.discount = Number(discount);
            } else {
                discount = this.agent.discount;
                discountField.value = discount;
            }

            if (this.agent instanceof QLearningAgent) {
                // Pull and store the learning rate (alpha).
                let alphaField = document.getElementById('alphaLearn');
                let alpha = alphaField.value;
                if (!isNaN(alpha) && Number(alpha) >= 0.0) {
                    this.agent.alpha = Number(alpha);
                } else {
                    alpha = this.agent.alpha;
                    alphaField.value = alpha;
                }
            }
        }
    }
}


/* For the first round, the player (user) start's as 'X' and the computer as 'O'. 
   Instantiate the game with default parameters, set the computer's agent, and set
   the reward function. */
let playerChoice = 'X';
let game = new TicTacToe();
let agent = new QLearningAgent(playerChoice == 'X' ? 'O' : 'X')
let rewardFunc = terminalOnly;

const debug = false;
if (!debug) {
    // When debug is false, turn off all logging.
    disableLogging();
}

// Instantiate the game handler.
window.gameHandler = new GameHandler(
    game,
    playerChoice,
    agent,
    rewardFunc,
);

// Bind enter key to the reset button.
document.onkeydown = function (e) {
    e = e || window.event;
    switch (e.which || e.keyCode) {                                
        case 13:
            if(window.gameHandler.game.checkTermination()) {
                window.gameHandler.resetGame();
            }
            break;
    }
}

window.onload = function () {
    // Store the grid and reset button in the game handler once the page loads.
    let buttons = document.getElementsByClassName('gridButton');
    window.gameHandler.setGrid(buttons);
    let resetButton = document.getElementById('resetGame');
    window.gameHandler.setReset(resetButton);
};