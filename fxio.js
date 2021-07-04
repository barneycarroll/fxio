export const adapter = generator => function adapter({attrs, children}){
  const fx = Object.freeze(new class FX {
    enter    = Symbol('enter')
  //paint    = Symbol('paint')
    update   = Symbol('update')
  //teardown = Symbol('teardown')
    exit     = Symbol('exit')
  })
  
  const io = new class IO {
    attrs    = attrs
    children = children
    dom
    domSize
  }
  
  const iterator = generator(fx, io)
  
  let created = false
  let removed = false
  
  const component = {
    oncreate({dom, domSize}){
      Object.assign(io, {dom, domSize})
      
      created = true
    },
    
    onupdate({attrs, children, dom, domSize}){
      Object.assign(io, {attrs, children, dom, domSize})
    },
    
    onbeforemove(){
      removed = true
    },
  }
  
  void function iterate({value}){
    if(!value)
      return
    
    else if(typeof value === 'function'){
      component.view = value

      iterate(iterator.next())
    }
    
    else if(typeof value.then === 'function')
      value
        .then(
          $ => iterate(iterator.next($)),
          e => iterate(iterator.throw(e)),
        )
    
    if(value === fx.enter)
      if(created)
        iterate(iterator.next(io))
      
      else
        component.oncreate = ({dom, domSize}) => {
          created = true

          Object.assign(io, {dom, domSize})

          iterate(iterator.next(io))
        }
    
    else if(value === fx.update)
      if(removed)
        iterate(iterator.next(false))
      
      else
        component.onupdate = ({attrs, children, dom, domSize}) => {
          Object.assign(io, {attrs, children, dom, domSize})

          iterate(iterator.next(io))
        }
    
    else if(value === fx.exit){
      component.onremove = () => {
        removed = true
      }
      
      component.onbeforeremove = () => {
        removed = true
        
        return new Promise(resolve => {
          void function iterate({value, done}){
            if(done)
              resolve(value)
            
            else if(value && typeof value.then === 'function')
              value.then(
                $ => iterate(iterator.next($)),
                e => iterate(iterator.throw(e)),
              )
          }(iterator.next())
        })
      }
    }
  }(iterator.next(io))
  
  return component
}

const Generator  = (function * (){}).constructor

const components = new WeakMap

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
)

function getSet(map, key, factory){
  if(map.has(key))
     return map.get(key)
  
  const value = factory(key, map)
  
  map.set(key, value)
  
  return value
}
