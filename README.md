# Mithril FX Sequencer

*Alpha-level stuff: API in flux; partially documented; untested code.*

Lifecycle methods and Hooks? Both are worse! The lifecycle as pertains to UI consumers is best expressed as a *sequence* of *effects* (FX). The Sequencer API exposes a function enabling the expression of components as generators!! :0

## What?

```js
import {sequencer, extensions} from './index.js'

// Mithril extensions enable optional performance & UX optimisations for the advanced feature set
Object.assign(m, extensions)

// Define components by transforming generators into Mithril components via the sequencer function
const MySequence = sequencer(function * FadeInOut(FX, IO){
  // Define the view by yielding a function
  yield ({children}) => children

  // Yield til DOM is available
  yield FX.enter

  const {
    duration = 600,
    easing   = 'ease-in-out',
  } = IO.attrs

  const entry = IO.dom.animate({
    opacity: [0, 1]
  }, {
    duration,
    easing, 
  })

  // Yield til 'onbeforeremove'
  yield FX.exit

  // Yielding a promise is the same as await
  yield entry.finished

  yield IO.dom.animate({
    opacity: [1, 0]
  }, {
    duration,
    easing,
  })
})
```

## Wherefore?

### A brief history of virtual DOM lifecycle

*This treatise is concerned with a Mithril-centric perspective on API history.*

In 2013 React kicked off with the component class entity and its various lifecycle methods. In 2014 Mithril proposed a declarative `config` method which triggered on creation and update for any given node, then in 2016 Mithril emulated the multiple-methods convention established by React, implemented a method for asynchronous DOM removal, and allowed the full lifecycle to be defined in components and applied inline for any node, as well as closure components, allowing lifecycle methods to share scope. Simultaneously, Mithril implemented a consistent `vnode` entity representation as the received argument of all methods. In 2018, React implemented Hooks, which also allowed shared scope access - after a fashion.

Broadly speaking each iteration has refined a balance between legibility and brevity in the small, and clarity of sequence in scenarios involving multiple lifecycle hooks: simple effects should be easy and succinct, and necesarily more involved operations ought to be traceable in their complexity manageable.

But from a superficial analysis, each development has merely consisted of changing the configuration by which various functions are declared: the mechanism by which setup and teardown effects are declared in such a way that they can interpolate DOM and share reliably up-to-date references … is less ambiguous a task with hooks than it was with class components - but it's still a case of configuring 3 functions; unlike Mithril & class components, hooks enforce the sequence in which these expressions are declared – but it doesn't match the chronological sequence of their execution (teardown is expressed before the view); ironically, whilte the view is the first 'method' to execute in the hooks idiom, its contents are always expressed last. 

### Breaking the cycle

Ultimately these problems boil down a frustration with the idiom of lifecycle as we know it, which folds 2 discrete conceptual cycles into 1 idiom in variously discordant ways: one cycle describes the finite sequential stages of an instances existence, from initialisation, to DOM persistence, through to teardowm; the other describes a sequence of pre-view, view, and post-update, which repeats one or more times within the finite loop. 

Generators are Javascripts native mechanism for describing sequences. Rather than declaring new functions and assigning or passing them to the relevant API, we have a single scope for all our components concerns: we simply yield a symbol back to the library until the desired stage of lifecycle.

## How?

```js
function * LinearSequence(FX) {
  // 1. Initialisation…
  
  yield FX.entry
  
  // 2. DOM is a available
  
  yield FX.paint
  
  // 2.1. Persist DOM mutations to screen
  
  while(yield FX.update) {
    // 3... Input & Output persistence
    
    yield FX.paint
    
	  // 3.1... Persist DOM mutations to screen
  }
  
  yield FX.teardown
  
  // 4. Teardown!
  
  yield FX.exit
  
  // 5? Async DOM removal conditions 
}
```

This represents the full FX lifecycle of the component, which necesarilly runs in chronological sequence: Moving between desired steps in the lifecycle is achieved by yielding the relevant symbol. 

But this won't address the primary concern of components, namely view definition or input access. `yield`ing to a function defines the view.

```js
function * ViewComponent() {
  // 👇 Executes on each new input
  yield ({attrs: {name}, children}) => [
    // 👆 Receives its own unmediated input
    m('h1', 'Hello ', name, '!'),
    children,
  ]
}
```

Meanwhile, `yield`ing a value which is neither a function nor an `FX` step will cause the sequencer to `Promise.resolve` the received value, making the functionality identically to `await` (which assumes asynchronicity and necessarilly involves introducing an asynchronous gap).

```js
function * AsyncComponent({}, IO) {
  yield () =>
    m('h1', 'Loading...')
  
    try {
      const {data} = yield fetch(IO.attrs.url).then(x => x.json())
  
      yield () => [
        m('h1', 'Data:'),

        data.map(item => 
          m('li', item)
        ),
      ]
    }
    catch(error) {
      yield () => [
        m('h1', 'Error!'),
	
        m('p.error', error),
      ]
    }
}
```

