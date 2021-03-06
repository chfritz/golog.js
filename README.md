# Golog.js (work in progress)

A JavaScript implementation of the agent-programming language [GOLOG](http://bibbase.org/network/publication/levesque-reiter-lesprance-lin-scherl-gologalogicprogramminglanguagefordynamicdomains-1997)

Specifically, we use the transition semantics of [ConGolog](http://bibbase.org/network/publication/degiacomo-lesprance-levesque-congologaconcurrentprogramminglanguagebasedonthesituationcalculus-2000).

To learn more about Golog, please visit the [University of Toronto's Cognitive Robotics Groups' website](http://www.cs.toronto.edu/cogrobo/main/systems/index.html).

To run the tests, which show examples of usage, do:
```sh
npm test
```

### Technical notes

This may only be comprehensible to those who already know Golog.

- We currently do *not* use declarative conditions (an in particular we do *not* use the Situation Calculus). The state of the world is simply represented using state variables with associated values, and conditions are actual Boolean JavaScript functions that take the state as the argument.
- Similarly, actions are executable javascript functions that change the state.
- The interpreter switches evaluation context from interpreted Golog to native
javascript in several places. This is to be pragmatic about the amount of
interpretation necessary. This is made possible by using JS syntax for programs.
All programs are syntactically correct JS programs as well -- but not executable
as such, because GOLOG requires a different execution semantics than javascript.

**This is work in progress and not yet finished.**


### ToDo List

- [x] ~~waitFor (state changes)~~ can be implemented as action
- [x] action return values
- [x] make actions async (but make them sync at the program execution layer)
- [x] concurrency
- [ ] non-deterministic iteration (δ*)
- [ ] interrupts (φ → δ)
- [ ] procedures
- [x] a new construct, "either", which is like a non-deterministic choice ("|"),
  but both programs are executed and the construct is final once either of them is
  final; to allow procedure overrides and timeouts
- [x] initialize Golog with actions (rather than importing them directly)
- [ ] make golog.js OO
