import {state} from './integrations.js'

export default Sequence => function SequencerAdapter({attrs, children}){
  const FX = new FX
  const IO = Object.assign(new IO, {attrs, children})

  let entered = false
  let exiting = false
  let exit
  let teardown
  let vnode

  const Component = {
    view(){},

    oninit(){
      [vnode] = arguments
    },

    onbeforeupdate(){
      [vnode] = arguments
    },

    oncreate({dom}){
      Object.assign(IO, {dom})

      entered = true
    },

    onbeforeremove(){
      exiting = true

      if(teardown)
        teardown()
      
      if(exit)
        return exit()
    },
  }

  const iterator = Sequence(FX, IO)

  void function iterate({value, done} = iterator.next()){
    if(done)
      return

    else if(typeof value === 'function'){
      Component.view = value

      if(!state.pending)
        patch(vnode, Component.view.call(vnode.state, vnode))
    }

    else if(value === FX.paint){
      paints.push(next)

      if(!state.rendering && !state.pending)
        requestAnimationFrame(paint)
      
      else
        state.schedule(paint)
    }
    
    else if(value === FX.entry)
      if(entered)
        next()
    
      else
        Component.oncreate = ({dom, domSize}) => {
          Object.assign(IO, {dom, domSize})

          next()
        }
        
    else if(value === FX.update)
      if(exiting)
        next(null)
        
      else
        Component.onupdate = ({dom, domSize, attrs, children}) => {
          Object.assign(IO, {dom, domSize, attrs, children})

          next()
        }

    else if(value === FX.teardown)
      if(exiting)
        next()

      else
        teardown = next

    else if(value === FX.exit)
      exit = iterate = ({value, done} = iterator.next()) =>
        done || Promise.resolve(value).then(...fork())

    else
      Promise.resolve(value).then(...fork())
  }()

  return Component
    
  function next(_ = IO){
    iterate(iterator.next(_))
  }

  function fork(){
    return [
      _ => iterate(iterator.next(_)), 
      _ => iterate(iterator.error(_)),
    ]
  }
}

function patch(vnode, vdom){
  const {dom}    = vnode
  const {vnodes} = dom.parentNode
  
  dom.parentNode.vnodes = [
    {dom: dom.previousSibling}, 
    vnode.instance, 
    {dom: dom.nextSibling},
  ]

  m.render(dom.parentNode, [
    {dom: dom.previousSibling}, 
    vdom, 
    {dom: dom.nextSibling},
  ])

  Object.assign(dom.parentNode, {vnodes})
}

const paints = []

function paint(){
  if(paints.length){
    // Force browser paint by querying computed layout
    void document.body.clientHeight
    
    paints.forEach(fn => fn())
    
    paints.length = 0
  }
}

class FX {
  entry    = Symbol('entry')
  update   = Symbol('update')
  teardown = Symbol('teardown')
  exit     = Symbol('exit')
  paint    = Symbol('paint')
}

class IO {
  attrs
  children
  dom
  domSize
}