import React, { Component } from 'react';
import './App.css';

import {interpolateViridis} from 'd3-scale-chromatic';
import {scaleSequential, scaleLinear} from 'd3-scale';
import {histogram, range} from 'd3-array';
import {randomUniform} from 'd3-random';


function getRandomVelocity() {
  const maxSpeed = 2
  return {
    x: randomUniform(maxSpeed/2, maxSpeed)() * (Math.random() < 0.5? 1: -1),
    y: randomUniform(maxSpeed/2, maxSpeed)() * (Math.random() < 0.5? 1: -1),
  }
}

// TODO подумай, чи треба тут fieldSize, можливо задавати положення в
// межах від 0 до 1, а потім множити на fieldSize?
function getNewCreature(fieldSize, creatureVarsNum, id, val) {
  val = val || Math.round(Math.random() * (creatureVarsNum - 1))
  const radius = 9
  const coords = {
    x: Math.random() * (fieldSize - 2 * radius) + radius,
    y: Math.random() * (fieldSize - 2 * radius) + radius,
  }
  return {
    velocity: getRandomVelocity(),
    radius: radius,
    coords: coords,
    val: val,
    id: id,
  }
}

function getCreaturesChild(fieldSize, creature, id) {
  const velocity = {
    x: -creature.velocity.x * randomUniform(8, 12)() / 10,
    y: -creature.velocity.y * randomUniform(8, 12)() / 10,
  }
  return {
    ...creature,
    velocity: velocity,
    id: id,
  }
}


function handleFieldSideCollision(fieldSize, creature, direction) {
  const coords = creature.coords
  const velocity = creature.velocity
  let newVelocity = velocity[direction]
  let newCoord = coords[direction] + newVelocity

  if (newCoord - creature.radius < newVelocity) {
    newVelocity = -newVelocity
    // TODO why is this +1 needed
    newCoord = creature.radius + 1
  } else if (newCoord + creature.radius > fieldSize - newVelocity) {
    newVelocity = -newVelocity
    newCoord = fieldSize - creature.radius
  }
  return {
    ['coord' + direction.toUpperCase()]: newCoord,
    ['velocity' + direction.toUpperCase()]: newVelocity,
  }
}

function moveCreature(fieldSize, creature) {
  let {coordX, velocityX} = handleFieldSideCollision(fieldSize, creature, 'x')
  let {coordY, velocityY} = handleFieldSideCollision(fieldSize, creature, 'y')

  return {
    ...creature,
    velocity: {x: velocityX, y: velocityY},
    coords: {x: coordX, y: coordY},
  }
}


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
// TODO потестувати швидкодію і навантаження


class Simulation extends Component {
  constructor (props) {
    super(props)

    this.size = 400
    this.creatureVarsNum = 11
    this.initialCreatureCount = 100
    this.maxCreatures = 200
    this.reproduceTick = 2000
    this.reproduceProb = .05
    this.moveTick = 70

    this.colorScale = scaleSequential(interpolateViridis)
      .domain([0, (this.creatureVarsNum - 1)])
    this.newCreature = getNewCreature.bind(null, this.size, this.creatureVarsNum)
    this.state = {
      creatures: Array(this.initialCreatureCount).fill().map(
        // TODO check the extreme values probability
        (_, i) => this.newCreature(i)
      )
    }

    this.killCreature = this.killCreature.bind(this)
    this.reproduceCreatures = this.reproduceCreatures.bind(this)
    this.moveCreatures = this.moveCreatures.bind(this)
  }

  componentDidMount() {
    this.reproduceTimerID = setInterval(
      () => this.reproduceCreatures(), this.reproduceTick
    );
    this.moveTimerID = setInterval(
      () => this.moveCreatures(), this.moveTick
    )
  }

  componentWillUnmount() {
    clearInterval(this.reproduceTimerID)
  }

  killCreature(creatureIndex) {
    this.setState((prevState, props) => {
      const creatures = prevState.creatures.filter(
        creature => creature.id !== creatureIndex
      )
      return {'creatures': creatures}
    })
  }

  reproduceCreatures() {
    this.setState((prevState, props) => {
      const creatures = prevState.creatures.slice()
      let maxId = Math.max(...creatures.map(cr => cr.id))
      const creaturesNum = creatures.length
      for (let i=0; i < creaturesNum; i++) {
        if ((creaturesNum + i + 1) <= this.maxCreatures && Math.random() < this.reproduceProb) {
          creatures.push(getCreaturesChild(this.size, creatures[i], i+maxId+1))
        }
      }
      return {'creatures': creatures}
    })
  }

  moveCreatures() {
    this.setState((prevState, props) => {
      const creatures = prevState.creatures
      const newCreatures = []
      for (let creature of creatures) {
        newCreatures.push(moveCreature(this.size, creature))
      }
      return {'creatures': newCreatures}
    })
  }

  render() {
    const creatures = this.state.creatures.map(
      creature => <Creature key={creature.id}
        colorScale={this.colorScale} creature={creature}
        kill={this.killCreature}/>
    )
    return (<div>
      <svg width={this.size} height={this.size} className='simulation'
        onDragStart={(e) => e.preventDefault()}>
        <rect width={this.size} height={this.size} x="0" y="0"
          fill={this.colorScale(this.creatureVarsNum / 2)}/>
        {creatures}
      </svg>
      <CreatureDistribution data={this.state.creatures} width={this.size}
        colorScale={this.colorScale} creatureVarsNum={this.creatureVarsNum}/>
    </div>)
  }
}

class Creature extends Component {
  render() {
    const data = this.props.creature
    const coords = data.coords
    return (
      // TODO circles shouldn't collide with each other
      // or can they?
      <circle cx={coords.x} cy={coords.y} r={data.radius}
        fill={this.props.colorScale(data.val)}
        onClick={() => this.props.kill(data.id)}/>
    )
  }
}

class CreatureDistribution extends Component {
  constructor(props) {
    super(props)
    this.binCount = props.creatureVarsNum
    this.histGenerator = histogram().value(d => d.val)
      .thresholds(range(1, this.binCount))
      .domain([0, this.binCount])
  }
  render() {
    const histData = this.histGenerator(this.props.data)
    const height = 100
    const width = this.props.width
    const rectWidth = width / this.binCount
    // TODO improve scale to be consistent and nice
    const yScale = scaleLinear().range([0, height]).domain([0, .4])
    const rects = histData.map(
      (d, i) => <rect key={d.x0} x={i * rectWidth} y={height - yScale(d.length / this.props.data.length)}
                 width={rectWidth} height={yScale(d.length / this.props.data.length)}
                 fill={this.props.colorScale(i)}/>
    )
    return (
      <svg width={width} height={height} onDragStart={(e) => e.preventDefault()}>
        {rects}
      </svg>
    )
  }
}

export default App;
