import React, { Component } from 'react';
import './App.css';

import {interpolateViridis} from 'd3-scale-chromatic';
import {scaleSequential, scaleLinear} from 'd3-scale';
import {histogram, max, range} from 'd3-array';

class App extends Component {
  render() {
    return (<article className='content'>
      <Simulation />
    </article>)
  }
}

// TODO зараз чисельність популяції постійно зростає, це ОК?
// TODO додати рух
// TODO додати контроль клавіатурою
// TODO додати розмноження генетикою (можливо статеве)
// TODO додати перешкоди або окрему смугу для «полювання»
// TODO додати історію розподілу


class Simulation extends Component {
  constructor (props) {
    super(props)
    // TODO set all the simulation params here
    this.createVarNum = 33
    this.initialCreatureCount = 50
    this.maxCreatures = 300
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
    this.reproduceCreatures = this.reproduceCreatures.bind(this)
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.reproduceCreatures(),
      2000
    );
  }

  componentWillUnmount() {
    clearInterval(this.timerID)
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

  reproduceCreatures() {
    // TODO async update
    const creatures = this.state.creatures.slice()
    let maxId = Math.max(...creatures.map(cr => cr.id))
    const creaturesNum = creatures.length
    for (let i=0; i < creaturesNum; i++) {
      if ((creaturesNum + i + 1) <= this.maxCreatures && Math.random() > .95) {
        creatures.push({id: i+maxId+1, val: creatures[i].val})
      }
    }
    this.setState({'creatures': creatures})
  }

  render() {
    const size = 400
    const creatures = this.state.creatures.map(
      creature => <Creature key={creature.id} fieldSize={size}
        colorScale={this.colorScale} featureVal={creature.val}
        id={creature.id} kill={this.killCreature}/>
    )
    return (<div>
      <svg width={size} height={size} className='simulation'>
        <rect width={size} height={size} x="0" y="0"
          fill={this.colorScale(this.createVarNum / 2)}/>
        {creatures}
      </svg>
      <CreatureDistribution data={this.state.creatures}
        colorScale={this.colorScale}/>
    </div>)
  }
}

class Creature extends Component {
  constructor(props) {
    super(props)
    this.size = 9
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

class CreatureDistribution extends Component {
  constructor(props) {
    super(props)
    // TODO pass bin count as param?
    this.binCount = 33
    this.maxCreatures = 300
    this.histGenerator = histogram().value(d => d.val)
      .thresholds(range(1, this.binCount))
      .domain([0, this.binCount])
  }
  render() {
    const histData = this.histGenerator(this.props.data)
    const height = 100
    const width = 400
    const rectWidth = width / this.binCount
    const yScale = scaleLinear().range([0, height])
      .domain([0, .6])
    console.log(histData)
    const rects = histData.map(
      (d, i) => <rect x={i * rectWidth} y={height - yScale(d.length / this.props.data.length)}
                 width={rectWidth} height={yScale(d.length / this.props.data.length)} fill={this.props.colorScale(i)}/>
    )
    return (
      <svg width={width} height={height}>
        {rects}
      </svg>
    )
  }
}

export default App;
