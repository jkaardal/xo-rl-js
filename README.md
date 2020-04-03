# xo-rl-js
Teach a computer to play Tic-Tac-Toe (Noughts &amp; Crosses) in a browser via tabular Reinforcement Learning.

## Trying it out locally

xo-rl-js provides a simple UI in the file `xo.html` that may be run locally in the browser. Since xo-rl-js makes use of ES6 javascript syntax, some browsers may have CORS policy issues if you simply try to open the file in the browser and play the game (javascript modules will not load). In this case, you will need to run a local server like the simple python http server:
```python
python -m http.server
```
which should serve xo-rl-js on localhost:8000 by default (see the [documentation](https://docs.python.org/3/library/http.server.html) for more information).

Three hyperparameters are provided:
- `epsilon`: is the probability that the computer will make a random move. This is to make sure the computer explores rather than getting stuck behaving suboptimally. Since it is a probability, the value should be in [0, 1].
- `discount`: a discount factor that can be adjusted to change the "reach" of a reward back in time. This is usually kept at 1.0 in episodic games (games that terminate). In continuous games, this would be <1.0 to ensure that the total reward does not diverge. (Refer to the literature to learn more)
- `learning rate`: the "speed" at which the computer learns from a game. The learning rate must be greater than or equal to zero. A small learning rate means that the computer will learn slowly while a large learning rate could lead learning to be volatile and not learn. The default value of 0.1 seems to work adequately but has not been optimized in any way.

## Behind the scenes

xo-rl-js uses reinforcement learning to teach the computer (known as the "agent") how to play the game from scratch. The basic idea behind reinforcement learning is that an agent, with the ability to influence future states of the game, is to learn via trial and error how to behave optimally (i.e. learning an optimal policy). In particular, the computer is using tabular Q-learing to reach an optimal policy. 

As you are about to find out, the computer is not terribly smart and does not learn any generalization of how the rules of the game work. This is because, unlike us, the computer has virtually no prior knowledge about how games work, what the rules are (beyond what is a valid move), or anything else about how the universe works. It simply observes the state, chooses an action, and receives a reward/punishment. Thus, to speed up learning, the computer is imbued with the knowledge that the game board has rotational and mirror symmetry and exploits that fact to recognize equivalent positions when making choices. To speed up learning even further, the agent also learns from its human opponent's actions and not just its own (which is possible because Q-learning is off-policy).

For the time being, the computer is set to use a Q-learning agent but also has code for a Monte Carlo agent both of which learn the action-value (Q) function. A reward/punishment is provided to the computer only at the end of each game (episode) with value 1 if the computer wins, -1 if the computer loses, and 0 if the game is a draw. The policy (behavior) function is epsilon greedy. The javascript code is, however, set-up to accept other agents and reward functions.
