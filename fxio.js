// The adapter consumes a sequence generator and returns a Mithril-consumable component
export const adapter = generator => function Sequencer(vnode){
  // effects instructions from the consuming sequence
  const fx = Object.freeze(new class FX {
    enter    = Symbol('enter')
    paint    = Symbol('paint')
    update   = Symbol('update')
    exit     = Symbol('exit')
  })
  // input & output readable by sequence
  const io = new class IO {
    get attrs(){     return vnode.attrs     }
    get children(){  return vnode.children  }
    get dom(){       return vnode.dom       }
    get domSize(){   return vnode.domSize   }
  }
  // this is the sum of the sequences surface interface
  const iterator = generator(fx, io)
 
  // instructions passed between component & iterator
  const cmd = Object.create({
    view    : () => '',
    ready   : () => {},
    update  : () => {},
    exit    : () => {},
    resolve : undefined, // defined below
  })
 
  // state shared between component & iterator
  const state = {
    ready  : false,
    exit   : false,
    done   : new Promise(_ => {
      cmd.resolve = _
    })
  }
  
  void function iterate({value, done}){
    delete cmd.update
    
    if ( !done && value == null )
      iterate(iterator.next(true))
    
    else if(done)
      cmd.resolve()
    
    else if(typeof value === 'function'){
      cmd.view = value

      iterate(iterator.next(true))
    }

    else if('fxio' in value){
      value.fxio()

      iterate(iterator.next(true))
    }
    
    else if(value === fx.ready)
      if(state.ready)
        iterate(iterator.next({dom : vnode.dom, domSize: vnode.domSize}))
      
      else
        cmd.ready = () =>
          iterate(iterator.next({dom : vnode.dom, domSize: vnode.domSize}))
    
    else if(value === fx.update)
      if(state.exit)
        iterate(iterator.next(false))
      
      else
        cmd.update = _ =>
          iterate(iterator.next(_))
    
    else if(value === fx.exit)
      if(state.exit)
        iterate(iterator.next(false))
      
      else
        cmd.exit = _ =>
          iterate(iterator.next(_))
    
    else
      Promise
        .resolve(value)
        .then(
          value => iterate(iterator.next(value)),
          error => iterate(iterator.throw(error)),
        )
  }(iterator.next(io))
  
  // Mithril-consumed component interface 
  return {
    view(){
      return cmd.view.apply(this, arguments)
    },
      
    oncreate(_){
      Object.assign(vnode, _)
      
      state.ready = true
      
      cmd.ready(true)
    },
    
    onupdate(_){
      Object.assign(vnode, _)
      
      cmd.update(true)
    },
    
    onbeforeremove(){
      state.exit = true
      
      cmd.update(false)
      
      cmd.exit(true)
      
      return state.done
    },
    
    onremove(){
      state.exit = true
      
      cmd.update(false)
      
      cmd.exit(false)
    },
  }
}

const Generator  = (function * (){}).constructor

const components = new WeakMap

// Mithril monkey-patch
export const m = Object.assign(
  (tag, ...input) =>
    globalThis.m(
      (
        tag instanceof Generator 
      ?
        getSet(components, tag, adapter)
      :
        tag
      ),

      ...input,
    ),
  
  globalThis.m,

  {mount: (dom, tag) => 
    globalThis.m.mount(dom, (
      tag instanceof Generator 
    ?
      getSet(components, tag, adapter)
    :
      tag
    ))
  },
)

function getSet(map, key, factory){
  if(map.has(key))
     return map.get(key)
  
  const value = factory(key, map)
  
  map.set(key, value)
  
  return value
}
