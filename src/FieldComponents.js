import React from 'react';

import treesSvg from './imgs/trees.svg';
import treesLongSvg from './imgs/trees_long.svg';

// TODO split this into two different components and just select the right one
function FieldBackground(props) {
  let bckgrElemes
  if (props.type === 'disruptive') {
    const minVal = props.colorScale(props.colorScale.domain()[0] + 2)
    const maxVal = props.colorScale(props.colorScale.domain()[1] - 2)
    const stripNum = 2
    bckgrElemes = []
    for (let i=0; i < stripNum; i++) {
      bckgrElemes.push(
        <rect x={props.width / stripNum * i} y="0" width={props.width/stripNum}
        height={props.height} fill={i % 2? minVal : maxVal}/>,
      )
    }
  } else {
    bckgrElemes = [
      (<rect width={props.width} height={props.height}
        x="0" y="0" fill={props.colorScale(props.colorVal)}/>)
    ]
  }
  return <g>{bckgrElemes}</g>
}


// TODO split the transparent layer away
function Obstacles(props) {
  // TODO ignore clicking on Obstacles but allow clicking on anything else
  const href = props.type === 'disruptive'? treesLongSvg : treesSvg
  return <g className="obstacle-layer">
    <image xlinkHref={href} x="0" y="0" width={props.width}
      height={props.height}/>
  </g>
}

export {FieldBackground, Obstacles}
