# golog.js (incomplete)

A JavaScript implementation of the agent-programming language [GOLOG](http://bibbase.org/network/publication/levesque-reiter-lesprance-lin-scherl-gologalogicprogramminglanguagefordynamicdomains-1997)

Specifically, we use the transition semantics of [ConGolog](http://bibbase.org/network/publication/degiacomo-lesprance-levesque-congologaconcurrentprogramminglanguagebasedonthesituationcalculus-2000).

To learn more about Golog, please visit the [University of Toronto's Cognitive Robotics Groups' website](http://www.cs.toronto.edu/cogrobo/main/systems/index.html).

### Technical notes

This may only be comprehensible to those who already know Golog.

- We currently do *not* use declarative conditions (an in particular we do *not* use the Situation Calculus). The state of the world is simply represented using state variables with associated values, and conditions are actual Boolean JavaScript functions that take the state as the argument.
- Similarly, actions are executable javascript functions that change the state.


**This is work in progress and nowhere nearly finished.**
