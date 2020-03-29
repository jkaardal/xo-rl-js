"use strict";
import { InvalidActionError, TicTacToe } from './game.js';

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
 * Agent whose policy is to always choose a random, valid move.
 */
export class RandomAgent {
    /**
     * Instantiate a RandomAgent agent.
     * 
     * @param {TicTacToe} game An instantiation of TicTacToe.
     * @return {number} The action to take as an index in [0, 8].
     */
    policy(game) {
        let validActions = game.getValidActions();
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
     * @param {string} player Unused.
     */
    learn(game, rewardFunc, player) {

    }
}


/**
 * Agent that uses Monte Carlo to update a tabular action-value function (Q-function).
 */
export class MonteCarloAgent {
    /**
     * Instantiate a MonteCarloAgent agent.
     * 
     * @param {number} [epsilon=0.1] Probability of making a random valid move (epsilon greedy).  
     * @param {number} [discount=1.0] Reward discount factor. 
     * @param {number} [defaultQ=0.0] Initial value of the Q function for any state/action pair. 
     */
    constructor(epsilon=0.1, discount=1.0, defaultQ=0.0) {
        this.epsilon = epsilon;
        this.discount = discount;
        this.Q = new Map();
        this.defaultQ = defaultQ;
        this.countQ = new Map();
        this.rewards = [];
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
                console.log(`${MonteCarloAgent._hash(state, action)} MATCHES ${key}`);
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
                console.log(`${MonteCarloAgent._hash(state, action)} MATCHES ${key}`);
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
     * @return {number} Integer index representing the action taken in [0, 8].
     */
    policy(game) {
        // Get an array of valid action indices.
        let validActions = game.getValidActions();
        if (validActions.length === 0) {
            throw new InvalidActionError('There is nowhere left to make a move!');
        }
        if (Math.random() < this.epsilon) {
            // Take a random move with epsilon probability.
            return randomChoice(validActions);
        } else {
            // Map the current state and action proposals to Q-function keys.
            let keys = validActions.map((action, _) => this.getKey(game.state, action));
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

    /**
     * Learn by trial and error using Monte Carlo algorithm.
     * 
     * @param {TicTacToe} game Instantiation of TicTacToe. 
     * @param {function} rewardFunc Reward function that takes in game and player and
     *     returns a numeric reward.
     * @param {string} player Agent's player token from 'X' and 'O'.
     */
    learn(game, rewardFunc, player) {
        // Compute a reward given the current state and store.
        let reward = rewardFunc(game, player);
        this.rewards.push(reward);
        
        let outcome = game.checkTermination();
        if (outcome) {
            // Game is complete.
            let start, end;
            if (player == 'X') {
                // Offset for player 'X'.
                start = 0;
            } else {
                // Offset for player 'O'.
                start = 1;
            }

            // Condition used to find the final state acted on by agent.
            let condition = (
                (player == 'X' && game.stateHistory.length % 2 === 0) ||
                (player == 'O' && game.stateHistory.length % 2 !== 0)
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
                j--;
                console.log(`key: ${key}, q: ${q}, Q: ${this.Q.get(key)}, n: ${this.countQ.get(key)}, rewards: ${this.rewards}`)
            }
            // Reset the rewards storage.
            this.rewards = [];
        }
    }
}