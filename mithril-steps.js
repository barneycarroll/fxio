export default generator => function StepsAdapter({attrs, children}){
  // A persistent reference to latest
  // input ({attrs, children})
  // & output ({dom, domSize})
  const io       = {attrs, children}
  // The lifecycle steps to yield to
  const steps    = Object.freeze({
    create: Symbol('create'),
    update: Symbol('update'),
    remove: Symbol('remove'),
  }) 
  // These are supplied to the Steps generator
  const iterator = generator(io, steps)

  // State flags for iterator sequence logic
  let created  = false
  let removed  = false

  // The component instance returned to interface with Mithril:
  // Updates io & internal references 👆, mutated by iterator
  const component = {
    oncreate({attrs, children}){
      Object.assign(io, {attrs, children})
      
      created = true
    },

    onbeforeupdate({attrs, children}){
      Object.assign(io, {attrs, children})
    },

    onupdate({dom, domSize}){
      Object.assign(io, {dom, domSize})
    },

    onremove(){
      removed = true
    },
  }

  // The recursive iterator loop! 
  // Sniffs yielded values to determine logic:
  void function consume({value}){
    // A function is a view, and yields nothing
    // (view loop is orthogonal to steps sequence)
    if(typeof value === 'function'){
      component.view = value

      consume(iterator.next())
    }
    // Pre-remove step, promises are arbitrary values:
    // Yield back to generator for interpolation.
    else if(typeof value.then === 'function')
      value
        .then(
          $ => consume(iterator.next($)),
          e => consume(iterator.throw(e)),
        )
    // The semantic purpose of create is DOM exposure,
    // so the io is yielded again for destructuring convenience.
    else if(value === steps.create){
      // If promise yields occur at initialisation,
      // oncreate will already have fired.
      if(created)
        consume(iterator.next(io))
      // Otherwise the method is overwritten
      else
        component.oncreate = ({dom, domSize}) => {
          created = true

          Object.assign(io, {dom, domSize})

          consume(iterator.next(io))
        }
    }
    // Update can be yielded as a while operand,
    // allowing loops within the generator body
    else if(value === steps.update)
      // Terminates the loop 👆, indicating teardown
      if(removed)
        consume(iterator.next(false))

      else
        component.onupdate = ({dom, domSize}) => {
          Object.assign(io, {dom, domSize})

          // Yield io for convenience of input comparison
          consume(iterator.next(io))
        }
    
    else if(value === steps.remove){
      component.onremove = () => {
        removed = true

        if(!iterator.next().done)
          console.warn('Component was removed! Generator will iterate no further')
      }

      component.onbeforeremove = () => {
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
  }(iterator.next(io, steps))

  return component
}