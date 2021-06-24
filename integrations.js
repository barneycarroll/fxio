const {redraw, render} = globalThis.m

let renders = 0
let pending = false
const queue = []

// Imported by the sequencer, qualifying paint & view patches
export const state = Object.freeze({
  get pending(){ 
    return Boolean(pending)
  },
  get rendering(){
    return Boolean(renders)
  },
  schedule(){ 
    postDraw.push(...arguments) 
  }
})

// Imported by the consumer, to be merged into the Mithril interface
export const extensions = {
  render(){
    ++renders

    render.apply(this, arguments)

    --renders

    if(renders === 0){
      pending = false

      queue.forEach(fn => {
        fn()
      })

      queue.length = 0
    }
  },

  redraw: Object.assign(
    function redraw(){
      pending = true
    },

    {sync(){
      pending = true

      redraw.sync()
    }},
  ),
}