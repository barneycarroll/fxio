# fxio

Lifecycle methods? Hooks? Both are worse! The lifecycle as pertains to UI consumers is best expressed as a *sequence* of *effects* (`fx`), with a sharp distinction from input / output (`io`). 

Currently available as a [Mithril](https://mithril.js.org/) patch, the `fxio` API allows hyperscript to consume [generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) as an alternative means of declaring components. All stateful and reactive component behaviour is still possible in Sequences, but they are especially suited for effects. By [yielding](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield) to different *steps* of the components *sequence*, we reinstate the expressive power of imperative programming where it is best suited: in the description of single-scoped arbitrary commands to be executed sequentially.

## So

```sh
npm i --save fxio
```

## Then

```html
<script src=./unpkg.com/mithril/mithril.js></script>
<script>
function * MySequence(){ /* 🪄 */ }
</script>
<!-- Either: -->
<script type=module>
  import {adapter} from './fxio.js'

  const MyComponent = adapter(MySequence)

  m.mount(document.body, MyComponent)
</script>
<!-- Or: -->
<script type=module>
  import {m} from './fxio.js'

  m.mount(document.body, MySequence)
</script>
```

## What?

```js
function * FadeInOut(fx, io){
  // Define the view by yielding a function
  yield ({children}) => children

  // The fx object describes steps to yield until
  yield fx.ready

  const {
    duration = 600,
    easing   = 'ease-in-out',
  } = io.attrs

  const entry = io.dom.animate({
    opacity: [0, 1]
  }, {
    duration,
    easing, 
  })

  // fx.exit yielding true means async teardown is possible!
  if(yield fx.exit){
    // Yielding a promise is the same as await
    yield entry.finished

    // Async teardown won't resolve until the sequence completes
    yield io.dom.animate({
      opacity: [1, 0]
    }, {
      duration,
      easing,
    })
  }

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
function * LinearSequence(fx) {
  // 1. Initialisation…
  
  yield fx.ready
  
  // 2. DOM is a available
  
  yield fx.paint
  
  // 2.1. Persist DOM mutations to screen
  
  while(yield fx.update) {
    // 3... io updated
    
    yield fx.paint
    
    // 3.1... Persist DOM mutations to screen
  }

  if(yield fx.exit){
    // 4.1. Async teardown
  }

  // 4. Imperative teardown
}
```

This represents the full effects sequence of the component, which necesarilly runs in chronologically: Moving between desired steps in the lifecycle is achieved by yielding the relevant symbol. 

This won't address the primary concern of components, namely view definition or input access. Yielding to a function defines the view:

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

Meanwhile, yielding a value which is neither a function nor an `fx` step will cause the sequencer to `Promise.resolve` the received value, making the functionality identical to `await` (which assumes asynchronicity and necessarilly involves introducing an asynchronous gap).

```js
function * AsyncComponent({}, io) { // <- no fx 😮
  yield () =>
    m('h1', 'Loading...')
  
  try {
    const {data} = yield fetch(io.attrs.url).then(x => x.json())
  
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
  finally {
    m.redraw()
  }
}
```

*To be continued…*
