"use strict";
import { InvalidActionError, TicTacToe } from './game.js';
import { xoLog } from './logger.js';


class MisalignedPlayerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MisalignedPlayerError';
    }
}


class NotImplementedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotImplementedError';
    }
}


/**
 * Randomly choose an element of an array with uniform probability.
 * 
 * @param {Array(any)} arr An array.
 * @return {any} An element of arr.
 */
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}


/**
 * Agent is the base class including universal agent methods. It should not be instantiated
 * directly but rather used for inheritance.
 */
class Agent {
    /**
     * Instantiate a base Agent class.
     * 
     * @param {string} player Agent's player token from 'X' and 'O'.
     * @param {any} defaultQ Variable that may be used to set the initial value of Q.
     */
    constructor(player, defaultQ=null) {
        this.player = player;
        this.Q = new Map();
        this.defaultQ = defaultQ;
        this.countQ = new Map();
    }

    /**
     * Create a unique string from a state/action pair. E.g. "X___O____6".
     * 
     * @param {Array(string)} state State of the game board.
     * @param {number} action Integer index of the action to take.
     * @return {string} A unique string identifier of the state/action pair.
     */
    static _hash(state, action) {
        let key = state.join('');
        key += action;
        return key;
    }

    /**
     * Get a string key to index this.Q for the given state/action pair while accounting for
     * the rotation and mirror symmetry of the game board. If an equivalent board state can
     * be found via rotation and mirror symmetry, the key of the equivalent state/action is
     * returned. Otherwise, a key based on the current state/action pair is returned.
     * 
     * @param {Array(string)} state State of the game board. 
     * @param {number} action Integer index of the action to take.
     * @return {string} A string identifier of the state/action pair for indexing this.Q.
     */
    getKey(state, action) {
        // Rotate the state/action by n * 90 degrees to see if an equivalent key exists.
        let actionArray = TicTacToe.toActionArray(action);
        for (let n = 1; n < 4; n++) {
            let rotArray = TicTacToe.rot90(actionArray, n);
            let index = TicTacToe.toActionIndex(rotArray);
            let newState = TicTacToe.rot90(state, n);
            let key = MonteCarloAgent._hash(newState, index);
            if (this.Q.has(key)) {
                // A matching key was found, return it.
                xoLog(`${MonteCarloAgent._hash(state, action)} MATCHES ${key}`);
                return key;
            }
        }

        // Mirror the state/action across the vertical axis.
        let mirrorActionArray = TicTacToe.mirror(actionArray);
        let mirrorState = TicTacToe.mirror(state);
        // Rotate mirrored state/action by n * 90 degrees to see if an equivalent key exists.
        for (let n = 1; n < 4; n++) {
            let rotArray = TicTacToe.rot90(mirrorActionArray, n);
            let index = TicTacToe.toActionIndex(rotArray);
            let newState = TicTacToe.rot90(mirrorState);
            let key = MonteCarloAgent._hash(newState, index);
            if (this.Q.has(key)) {
                // A matching key was found, return it.
                xoLog(`${MonteCarloAgent._hash(state, action)} MATCHES ${key}`);
                return key;
            }
        }

        // No matching key found, return hash of current state.
        return MonteCarloAgent._hash(state, action);
    }

    /**
     * Choose an epsilon-greedy action given the current state of the board and action-value
     * function (Q-function). 
     * 
     * @param {TicTacToe} game Instance of TicTacToe.
     * @param {number|null} [horizon=null] When null, applies policy to latest state. If an
     *     integer, it will instead apply the policy to the state at index horizon in the 
     *     game's stateHistory.
     * @return {number} Integer index representing the action taken in [0, 8].
     */
    policy(game, horizon=null) {
        /* This function must be implemented by ancestors. */
        throw new NotImplementedError('Agent must implement policy().');
    }

    /**
     * Learn by trial and error using Monte Carlo algorithm.
     * 
     * @param {TicTacToe} game Instantiation of TicTacToe. 
     * @param {function} rewardFunc Reward function that takes in game and player and
     *     returns a numeric reward.
     */
    learn(game, rewardFunc) {
        /* Base agent does not learn. */
    }
}


/**
 * Base agent for agents with epsilon greedy policies.
 */
class EpsilonGreedyAgent extends Agent {
    /**
     * Instantiate a base Agent class.
     * 
     * @param {string} player Agent's player token from 'X' and 'O'.
     * @param {number} [epsilon=0.1] Probability of making a random valid move (epsilon greedy).
     * @param {any} [defaultQ=null] Variable that may be used to set the initial value of Q.
     */
    constructor(player, epsilon=0.1, defaultQ=null) {
        super(player, defaultQ);
        self.epsilon = epsilon;
    }

    /**
     * Choose an epsilon-greedy action given the current state of the board and action-value
     * function (Q-function). 
     * 
     * @param {TicTacToe} game Instance of TicTacToe.
     * @param {number|null} [horizon=null] When horizon is null, apply policy to latest state.
     *     If horizon is an integer, apply policy to game's stateHistory indexed by horizon.
     * @return {number} Integer index representing the action taken in [0, 8].
     */
    policy(game, horizon=null) {
        if (horizon == null && this.player != game.currentPlayer) {
            throw new MisalignedPlayerError(`Agent should be player ${this.player} but it is` +
                                            ` player ${game.currentPlayer}'s turn.`);
        }

        let state;
        if (horizon == null) {
            // Since horizon is null, apply policy to current state.
            state = game.state;
        } else {
            // Apply the policy to a historic state.
            state = game.stateHistory[horizon];
        }

        // Get an array of valid action indices.
        let validActions = game.getValidActions(horizon);
        if (validActions.length === 0) {
            throw new InvalidActionError('There is nowhere left to make a move!');
        }
        if (Math.random() < this.epsilon) {
            // Take a random move with epsilon probability.
            return randomChoice(validActions);
        } else {
            // Map the current state and action proposals to Q-function keys.
            let keys = validActions.map((action, _) => this.getKey(state, action));
            // Get an array of valid actions that have maximum return.
            let maxVal = -Infinity;
            let bestActions = [];
            for (let [index, key] of keys.entries()) {
                // Get the stored return of the proposed action if it exists; otherwise,
                // use the default Q.
                let val = this.Q.has(key) ? this.Q.get(key) : this.defaultQ;
                if (val > maxVal - 1.0e-4 && val < maxVal + 1.0e-4) {
                    // Return is equal to maximum (so far) return, store proposal.
                    bestActions.push(validActions[index]);
                } else if (val > maxVal) {
                    // Return is greater than maximum (so far) return, empty storage and
                    // store action.
                    maxVal = val;
                    bestActions = [validActions[index]];
                }
            }
            if (bestActions.length > 0) {
                // Randomly choose an action from those with maximum return.
                return randomChoice(bestActions);
            } else {
                // No action proposals available, return null (probably an error).
                return null;
            }
        }
    }
}


/**
 * Agent whose policy is to always choose a random, valid move.
 */
export class RandomAgent extends Agent {
    /**
     * Instantiate a RandomAgent agent.
     * 
     * @param {string} player Agent's player token from 'X' and 'O'.
     */
    constructor(player) {
        super(player);
    }

    /**
     * Instantiate a RandomAgent agent.
     * 
     * @param {TicTacToe} game An instantiation of TicTacToe.
     * @param {number|null} [horizon=null] When horizon is null, apply policy to latest state.
     *     If horizon is an integer, apply policy to game's stateHistory indexed by horizon.
     * @return {number} The action to take as an index in [0, 8].
     */
    policy(game, horizon=null) {
        if (horizon == null && this.player != game.currentPlayer) {
            throw new MisalignedPlayerError(`Agent should be player ${this.player} but it is` +
                                            ` player ${game.currentPlayer}'s turn.`);
        }
        let validActions = game.getValidActions(horizon);
        if (validActions.length === 0) {
            throw new InvalidActionError('There is nowhere left to make a move!');
        }
        return randomChoice(validActions);
    }

    /**
     * Learn by trial and error. RandomAgent does not learn.
     * 
     * @param {TicTacToe} game Unused.
     * @param {function} rewardFunc Unused.
     */
    learn(game, rewardFunc) {

    }
}


/**
 * Agent that uses Monte Carlo to update a tabular action-value function (Q-function).
 */
export class MonteCarloAgent extends EpsilonGreedyAgent {
    /**
     * Instantiate a MonteCarloAgent agent.
     * 
     * @param {string} player Agent's player token from 'X' and 'O'.
     * @param {number} [epsilon=0.1] Probability of making a random valid move (epsilon greedy).  
     * @param {number} [discount=1.0] Reward discount factor. 
     * @param {number} [defaultQ=0.0] Initial value of the Q function for any state/action pair. 
     */
    constructor(player, epsilon=0.1, discount=1.0, defaultQ=0.0) {
        super(player, epsilon, defaultQ);
        this.discount = discount;
        this.rewards = [];
    }

    /**
     * Learn by trial and error using Monte Carlo algorithm.
     * 
     * @param {TicTacToe} game Instantiation of TicTacToe. 
     * @param {function} rewardFunc Reward function that takes in game and player and
     *     returns a numeric reward.
     */
    learn(game, rewardFunc) {
        // Compute a reward given the current state and store.
        const reward = rewardFunc(game, game.currentPlayer, game.stateHistory.length);
        this.rewards.push(reward);
        
        const outcome = game.checkTermination();
        if (outcome) {
            // Game is complete.
            let start, end;
            if (this.player == 'X') {
                // Offset for player 'X'.
                start = 0;
            } else {
                // Offset for player 'O'.
                start = 1;
            }

            // Condition used to find the final state acted on by agent.
            let condition = (
                (this.player == 'X' && game.stateHistory.length % 2 === 0) ||
                (this.player == 'O' && game.stateHistory.length % 2 !== 0)
            );
            if (condition) {
                // Agent produced last state.
                end = game.stateHistory.length - 1;
            } else {
                // Agent produced second-to-last state.
                end = game.stateHistory.length - 2;
            }

            // Compute return for each intermediate and terminal state acted on by
            // the agent and compute the average across game episodes.
            let totalReward = 0.0;
            // Point to end of reward storage.
            let j = this.rewards.length - 1;
            // Go backwards through state/action history.
            for (let i = end - 1; i >= 0; i -= 2) {
                // Get a (equivalent) Q-function key for the state/action pair.
                let key = this.getKey(
                    game.stateHistory[i],
                    game.actionHistory[i]
                );
                // Get the past mean return/count for this state/action pair or use
                // default.
                let q = this.Q.has(key) ? this.Q.get(key) : this.defaultQ;
                let n = this.countQ.has(key) ? this.countQ.get(key) : 0;
                // Compute the return from the current episode.
                totalReward = this.rewards[j] + this.discount * totalReward;
                // Upadte the mean return of the state/action pair.
                this.Q.set(
                    key,
                    q * n / (n + 1) + totalReward / (n + 1)
                );
                // Update the number of episodes contributing the mean return update.
                this.countQ.set(key, n + 1);
                // Decrement reward storage index.
                j -= 1;
                xoLog(`key: ${key}, q: ${q}, Q: ${this.Q.get(key)}, n: ${this.countQ.get(key)}, \
                       rewards: ${this.rewards}`);
            }
            // Reset the rewards storage.
            this.rewards = [];
        }
    }
}


/**
 * Agent that performs temporal difference learning using Q-learning. To make the agent
 * learn more quickly, the agent learns off-policy from the its opponent's actions.
 * Learning is done offline at the end of the episode instead of online at intermediate
 * steps as is typically done because the implementation is simpler and the results are
 * equivalent because the agent cannot experience the same state multiple times in a
 * given episode. This uses an epsilon greedy policy.
 */
export class QLearningAgent extends EpsilonGreedyAgent {
    /**
     * Instantiate a Q-learning agent.
     * 
     * @param {string} player Agent's player token from 'X' and 'O'.
     * @param {number} [epsilon=0.1] Probability of making a random valid move (epsilon greedy).  
     * @param {number} [discount=1.0] Reward discount factor. 
     * @param {number} [alpha=0.1] The learning rate. Must be >= 0.
     * @param {number} [defaultQ=0.0] Initial value of the Q function for any state/action pair. 
     */
    constructor(player, epsilon=0.1, discount=1.0, alpha=0.1, defaultQ=0.0) {
        super(player, epsilon, defaultQ);
        this.discount = discount;
        this.alpha = alpha;
        this.agentRewards = [];
        this.opponentRewards = [];
    }

    /**
     * Helper function that computes updates to the Q function.
     * 
     * @param {TicTacToe} game Instantiation of TicTacToe.
     * @param {string} playerChoice A player token from 'X' and 'O'.
     * @param {function} rewardFunc Reward function that takes in game and player and
     *     returns a numeric reward.
     */
    updateQ(game, playerChoice, rewardFunc) {
        let start = playerChoice == 'X' ? 0 : 1;
        let end;
        let condition = (
            (playerChoice == 'X' && game.stateHistory.length % 2 == 0) ||
            (playerChoice == 'O' && game.stateHistory.length % 2 != 0)
        );
        if (condition) {
            // playerChoice made the last move in the game.
            end = game.stateHistory.length - 2;
        } else {
            // playerChoice did not make the last move in the game.
            end = game.stateHistory.length - 3;
        }

        // Loop through all intermediate states (states that did not lead to a terminal
        // state) in the episode where playerChoice had to choose a move to make.
        for (let i = start; i < end; i += 2) {
            // Compute the reward on the resulting state after a back and forth.
            let reward = rewardFunc(game, playerChoice, i + 2);

            // Get the value of Q at the initial state/action.
            let oldKey = this.getKey(
                game.stateHistory[i],
                game.actionHistory[i]
            );
            let oldQ = this.Q.has(oldKey) ? this.Q.get(oldKey) : this.defaultQ;

            // Take a greedy action on the next state (after a back and forth) and get
            // the value of Q with the state/action pair.
            let futureAction = this.policy(game, i + 2);
            let futureKey = this.getKey(
                game.stateHistory[i + 2],
                futureAction
            );
            let futureQ = this.Q.has(futureKey) ? this.Q.get(futureKey) : this.defaultQ;

            // Update the value of Q at the initial state.
            this.Q.set(
                oldKey,
                oldQ + this.alpha * (reward + this.discount * futureQ - oldQ)
            );
            xoLog(`player: ${playerChoice}, oldKey: ${oldKey}, oldQ: ${oldQ}, futureKey: ${futureKey}, \
                   futureQ: ${futureQ}, reward: ${reward}, newQ: ${this.Q.get(oldKey)}`);
        }

        // Compute the terminal reward.
        let terminalReward = rewardFunc(game, playerChoice, null);

        // Get the key of the last state/action pair where playerChoice made a move and
        // get the value of the Q function.
        let terminalKey = this.getKey(
            game.stateHistory[end],
            game.actionHistory[end]
        );
        let terminalQ = this.Q.has(terminalKey) ? this.Q.get(terminalKey) : this.defaultQ;

        // Update the value of Q for the terminal state/action pair.
        this.Q.set(
            terminalKey,
            terminalQ + this.alpha * (terminalReward - terminalQ)
        );
        xoLog(`player: ${playerChoice}, terminalKey: ${terminalKey}, terminalQ: ${terminalQ}, \
               terminalReward: ${terminalReward}, newQ: ${this.Q.get(terminalKey)}`);
    }

    /**
     * Learn by trial and error using Q-learning. Take advantage of off-policy learning
     * and also learn from the agent's opponent. Learning is done offline at the end
     * of each episode.
     * 
     * @param {TicTacToe} game Instantiation of TicTacToe.
     * @param {*} rewardFunc Reward function that takes in game and player and
     *     returns a numeric reward.
     */
    learn(game, rewardFunc) {
        const outcome = game.checkTermination();
        if (outcome) {
            // Game is complete.
            // Swap out epsilon such that the policy is greedy.
            const storeEpsilon = this.epsilon;
            this.epsilon = -1.0;

            // Learn from both player's trials.
            this.updateQ(game, 'X', rewardFunc);
            this.updateQ(game, 'O', rewardFunc);

            // Restore epsilon.
            this.epsilon = storeEpsilon;
        }
    }
}