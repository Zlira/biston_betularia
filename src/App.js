import React, { Component } from 'react';
import './App.css';

import {interpolateViridis} from 'd3-scale-chromatic';
import {scaleSequential} from 'd3-scale';

class App extends Component {
  render() {
    return (<article className='content'>
      <Simulation />
    </article>)
  }
}


class Simulation extends Component {
  constructor (props) {
    super(props)
    this.createVarNum = 33
    this.initialCreatureCount = 30
    this.colorScale = scaleSequential(interpolateViridis)
      .domain([0, (this.createVarNum - 1)])
    this.state = {
      creatures: Array(this.initialCreatureCount).fill().map(
        // TODO check the extreme values probability
        (_, i) => ({
          val: Math.round(Math.random() * (this.createVarNum - 1)),
          id: i,
        })
      )
    }

    this.killCreature = this.killCreature.bind(this)
  }

  killCreature(creatureIndex) {
    // TODO update for asynchronous state updates
    const creatures = this.state.creatures.filter(
      creature => creature.id !== creatureIndex
    )
    this.setState({
      'creatures': creatures,
    })
  }

  render() {
    const size = 400
    const creatures = this.state.creatures.map(
      creature => <Creature key={creature.id} fieldSize={size}
        colorScale={this.colorScale} featureVal={creature.val}
        id={creature.id} kill={this.killCreature}/>
    )
    return (<svg width={size} height={size} className='simulation'>
      <rect width={size} height={size} x="0" y="0"
        fill={this.colorScale(this.createVarNum / 2)}/>
      {creatures}
    </svg>)
  }
}

class Creature extends Component {
  constructor(props) {
    super(props)
    this.size = 8
    this.initialCx = Math.random() * (props.fieldSize - 2 * this.size) + this.size
    this.initialCy = Math.random() * (props.fieldSize - 2 * this.size) + this.size
  }
  render() {
    return (
      // TODO circles shouldn't collide with each other
      // or can they?
      <circle cx={this.initialCx} cy={this.initialCy} r={this.size}
        fill={this.props.colorScale(this.props.featureVal)}
        onClick={() => this.props.kill(this.props.id)}/>
        //stroke="white" stroke-width={.2}/>
    )
  }
}

export default App;
