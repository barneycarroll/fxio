export default generator => vnode => {
  Object.defineProperties(vnode, 
    Object.fromEntries(
      ['create','update','remove'].map(key => [key, {value: Symbol(key)}]),
    ),
  )
  let update  = true
  let created = false
  let removed = false
  let iterator

  const Component = {
    oninit(){
      iterator = generator.call(this, vnode)

      consume(iterator.next(vnode))
    },

    oncreate(){
      created = true
    },

    onremove(){
      removed = true
    },

    onbeforeupdate({attrs, children}){
      Object.assign(vnode, {attrs, children})
    },
  }

  return Component

  function consume({value, done}){
    if(done || value == null)
      return

    else if(typeof value.then === 'function')
      value
        .then(
          $ => consume(iterator.next($)),
          e => consume(iterator.throw(e)),
        )

    else if(value === vnode.create){
      if(created)
        consume(iterator.next(vnode.dom))

      else
        Component.oncreate = v => {
          created = true

          consume(iterator.next(vnode.dom))
        }
    }
    else if(value === vnode.update)
      if(removed)
        consume(iterator.next(false))

      else
        Component.onupdate = () =>
          consume(iterator.next(vnode.attrs))

    else if(typeof value === 'function'){
      update = true
      
      Component.view = value

      consume(iterator.next(vnode.attrs))
    }

    else if(value === vnode.remove){
      Component.onremove = () => {
        removed = true

        iterator.next()
      }

      Component.onbeforeremove = () => {
        delete Component.onremove

        removed = true

        return new Promise(resolve => {
          void function consume({value, done}){
            if(done)
              resolve(value)

            else if(value && typeof value.then === 'function')
              value.then(
                $ => consume(iterator.next($)),
                e => consume(iterator.throw(e)),
              )

            else
              consume(value)
          }(iterator.next())
        })
      }
    }
  }
}
