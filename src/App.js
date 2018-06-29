import React, { Component } from 'react';
import './App.css';

import {interpolateViridis} from 'd3-scale-chromatic';
import {scaleSequential, scaleLinear} from 'd3-scale';
import {histogram, range} from 'd3-array';
import {randomUniform} from 'd3-random';

import {getRandomPolygenes, polygenesToPhenotype, polygenesOffspring} from './Polygenes';
import {pairs} from './CollisionPairs';
import {randomChoice} from './Utils.js'


const GAME_PARAMS = {
  // creatures' velocity
  getSpeed: function() {
    const maxSpeed = 2
    const minSpeed = maxSpeed / 2
    return randomUniform(minSpeed, maxSpeed)() * randomChoice([-1, 1])
  },
  moveTick: 70,

  // creatures' attrs
  crSize: 9,
  crColors: scaleSequential(interpolateViridis),

  // population params
  crVarNum: 7,
  crInitCount: 50,
  crMaxCount: 200,
  crReproduceProb: .7,
  crDeathProb: .002,
  crMaturityAge: 4,
  populUpdateTick: 1000,

  // TODO add field width and height
  fieldSize: 400,
}

// TODO розмір залежний від віку?
// TODO додати контроль клавіатурою
// TODO додати перешкоди або окрему смугу для «полювання»
// TODO додати історію розподілу
// TODO додати кількість впольованих в кожен момент часу до історії розподілу
// TODO потестувати швидкодію і навантаження
// TODO подумати над ігровими компонентами:
// * кнопка старт
// * таймер
// * резульат: вижила/не вижила
// TODO move all the options to one object to be able to tweak them
// TODO think of better population dynamics: death and birth dependent on
// population density etc
// TODO можливо показати варіант, коли норма зміщується без селективного тиску
// TODO порефакторити: логіку для руху, розмноження etc - окремо
// TODO пересвідчитися, що в популяції на початку є всі можливі алелі

function getRandomVelocity() {
  const maxSpeed = 2
  return {
    x: GAME_PARAMS.getSpeed(),
    y: GAME_PARAMS.getSpeed(),
  }
}

// TODO подумай, чи треба тут fieldSize, можливо задавати положення в
// межах від 0 до 1, а потім множити на fieldSize?
function getNewCreature(fieldSize, creatureVarsNum, id, phenotype) {
  phenotype = phenotype || Math.round(Math.random() * (creatureVarsNum - 1))
  const radius = GAME_PARAMS.crSize
  const coords = {
    x: Math.random() * (fieldSize - 2 * radius) + radius,
    y: Math.random() * (fieldSize - 2 * radius) + radius,
  }
  const genotype = getRandomPolygenes((creatureVarsNum - 1) / 2)
  return {
    velocity: getRandomVelocity(),
    radius: radius,
    coords: coords,
    genotype: genotype,
    // TODO rename to phenotype
    phenotype: polygenesToPhenotype(genotype),
    id: id,
    lifespan: 0,
  }
}

function reproduce(cr1, cr2, id) {
  const genotype = polygenesOffspring(cr1.genotype, cr2.genotype)
  return {
    coords: {
      x: (cr1.coords.x + cr2.coords.x) / 2,
      y: (cr1.coords.y + cr2.coords.y) / 2,
    },
    // TODO is this OK?
    velocity: getRandomVelocity(),
    genotype: genotype,
    phenotype: polygenesToPhenotype(genotype),
    id: id,
    lifespan: 0,
    radius: cr1.radius,
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

class Simulation extends Component {
  constructor (props) {
    super(props)

    this.size = GAME_PARAMS.fieldSize
    this.creatureVarsNum = GAME_PARAMS.crVarNum
    this.initialCreatureCount = GAME_PARAMS.crInitCount
    this.maxCreatures = GAME_PARAMS.crMaxCount
    this.reproduceProb = GAME_PARAMS.crReproduceProb
    this.deathProb = GAME_PARAMS.crDeathProb
    this.maturityAge = GAME_PARAMS.crMaturityAge
    this.populUpdateTick = GAME_PARAMS.populUpdateTick
    this.moveTick = GAME_PARAMS.moveTick
    this.colorScale = GAME_PARAMS.crColors.domain([0, (this.creatureVarsNum - 1)])

    this.newCreature = getNewCreature.bind(null, this.size, this.creatureVarsNum)
    this.state = {
      creatures: Array(this.initialCreatureCount).fill().map(
        (_, i) => this.newCreature(i)
      )
    }

    this.killCreature = this.killCreature.bind(this)
    this.updatePopulation = this.updatePopulation.bind(this)
    this.moveCreatures = this.moveCreatures.bind(this)
    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)
  }

  start() {
    this.populUpdateTimerID = setInterval(
      () => this.updatePopulation(), this.populUpdateTick
    );
    this.moveTimerID = setInterval(
      () => this.moveCreatures(), this.moveTick
    )
  }

  stop() {
    clearInterval(this.populUpdateTimerID)
    clearInterval(this.moveTimerID)
  }

  componentWillUnmount() {
    this.stop()
  }

  killCreature(creatureIndex) {
    this.setState((prevState, props) => {
      const creatures = prevState.creatures.filter(
        creature => creature.id !== creatureIndex
      )
      return {'creatures': creatures}
    })
  }

  updatePopulation() {
    this.setState((prevState, props) => {
      const creatures = prevState.creatures
        // some creatures die randomly
        // TODO think of better function for life/death decision
        .filter(cr => !(Math.random() < cr.lifespan * this.deathProb))
        // others lifespan is updated
        .map(cr => ({...cr, lifespan: cr.lifespan + 1}))
      console.log(prevState.creatures.length, creatures.length)

      // the ones left alive can reproduce randomly
      const creaturesNum = creatures.length
      const maxId = Math.max(...creatures.map(cr => cr.id))
      const crPairs = pairs(creatures)

      let cr1, cr2, newCr, offspringCounter = 1
      for (let p of crPairs) {
        [cr1, cr2] = p
        if (creaturesNum + offspringCounter <= this.maxCreatures
            && Math.random() < this.reproduceProb
            && cr1.lifespan >= this.maturityAge
            && cr2.lifespan >= this.maturityAge) {
          newCr = reproduce(cr1, cr2, offspringCounter+maxId)
          console.log(newCr)
          creatures.push(newCr)
          offspringCounter += 1
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
      <div>
        <button onClick={this.start}>Старт</button>
        <button onClick={this.stop}>Стоп</button>
      </div>
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
      <circle cx={coords.x} cy={coords.y} r={data.radius}
        stroke={data.lifespan === 0? 'white' : null}
        fill={this.props.colorScale(data.phenotype)}
        onClick={() => this.props.kill(data.id)}/>
    )
  }
}


class CreatureDistribution extends Component {
  constructor(props) {
    super(props)
    this.binCount = props.creatureVarsNum
    this.histGenerator = histogram().value(d => d.phenotype)
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
                 fill={this.props.colorScale(i)} />
    )
    return (
      <svg width={width} height={height} onDragStart={(e) => e.preventDefault()}>
        {rects}
      </svg>
    )
  }
}

export default App;
