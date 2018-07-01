import React, { Component } from 'react';
import './App.css';
import 'semantic-ui-css/semantic.min.css';

import {interpolateViridis, interpolateRdYlGn, interpolateSpectral} from 'd3-scale-chromatic';
import {scaleSequential} from 'd3-scale';
import {histogram, range} from 'd3-array';
import {randomUniform} from 'd3-random';

import {getRandomPolygenes, polygenesToPhenotype, polygenesOffspring} from './Polygenes';
import {pairs} from './CollisionPairs';
import {randomChoice} from './Utils.js'
import {CreatureDistribution} from './CreatureDistribution';
import {Obstacles, FieldBackground} from './FieldComponents';

const GAME_PARAMS = {
  // creatures' velocity
  getSpeed: function() {
    const maxSpeed =1.5
    const minSpeed = maxSpeed / 2
    return randomUniform(minSpeed, maxSpeed)() * randomChoice([-1, 1])
  },
  moveTick: 100,

  // creatures' attrs
  crSize: 8,
  // return new scale each time to avoid modifictaion
  crColors: () => scaleSequential(interpolateSpectral),

  // population params
  crVarNum: 9,
  crInitCount: 60,
  crMaxCount: 100,
  crReproduceProb: .7,
  crDeathProb: .002,
  crMaturityAge: 4,
  populUpdateTick: 1000,

  fieldSize: 500,
  fieldColorUpdateTick: 1000,
}


function getRandomVelocity() {
  return {
    x: GAME_PARAMS.getSpeed(),
    y: GAME_PARAMS.getSpeed(),
  }
}

// TODO подумай, чи треба тут fieldSize, можливо задавати положення в
// межах від 0 до 1, а потім множити на fieldSize?
function getNewCreature(fieldWidth, fieldHeight, creatureVarsNum, id, phenotype) {
  phenotype = phenotype || Math.round(Math.random() * (creatureVarsNum - 1))
  const radius = GAME_PARAMS.crSize
  const coords = {
    x: Math.random() * (fieldWidth - 2 * radius) + radius,
    y: Math.random() * (fieldHeight - 2 * radius) + radius,
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

function moveCreature(fieldWidth, fieldHeight, creature) {
  let {coordX, velocityX} = handleFieldSideCollision(fieldWidth, creature, 'x')
  let {coordY, velocityY} = handleFieldSideCollision(fieldHeight, creature, 'y')

  return {
    ...creature,
    velocity: {x: velocityX, y: velocityY},
    coords: {x: coordX, y: coordY},
  }
}


class App extends Component {
  componentDidMount(){
    document.title = "Biston Betularia"
  }

  render() {
    return (<article className='content'>
      <Simulation type="stabilizing" title="Стабілізуючий добір"/>
      <Simulation type="directional" title="Pушійний добір"/>
      <Simulation type="disruptive" title="Дизруптивний добір"
        height={250} width={700} crVarNum={11} />
    </article>)
  }
}

class Simulation extends Component {
  constructor (props) {
    super(props)
    this.running = false

    // TODO configure game params for each type
    this.width = this.props.width || GAME_PARAMS.fieldSize
    this.height = this.props.height || GAME_PARAMS.fieldSize
    this.creatureVarsNum = this.props.crVarNum || GAME_PARAMS.crVarNum
    this.initialCreatureCount = GAME_PARAMS.crInitCount
    this.maxCreatures = GAME_PARAMS.crMaxCount
    this.reproduceProb = GAME_PARAMS.crReproduceProb
    this.deathProb = GAME_PARAMS.crDeathProb
    this.maturityAge = GAME_PARAMS.crMaturityAge
    this.populUpdateTick = GAME_PARAMS.populUpdateTick
    this.moveTick = GAME_PARAMS.moveTick
    // TODO only for the "directional" type?
    this.fieldColorUpdateTick = GAME_PARAMS.fieldColorUpdateTick

    this.colorScale = GAME_PARAMS.crColors().domain([0, (this.creatureVarsNum - 1)])
    this.histGenerator = histogram().value(d => d.phenotype)
      .thresholds(range(1, this.creatureVarsNum))
      .domain([0, this.creatureVarsNum])

    this.newCreature = getNewCreature.bind(
      null, this.width, this.height, this.creatureVarsNum
    )
    this.state = {
      creatures: Array(this.initialCreatureCount).fill().map(
        (_, i) => this.newCreature(i)
      ),
      history: [],
      fieldColorVal: this.creatureVarsNum / 2,
    }
    this.state.history.push(this.histGenerator(this.state.creatures))

    this.killCreature = this.killCreature.bind(this)
    this.updatePopulation = this.updatePopulation.bind(this)
    this.moveCreatures = this.moveCreatures.bind(this)
    this.updateFieldColor = this.updateFieldColor.bind(this)
    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)
  }

  componentWillUnmount() {
    this.stop()
  }

  start() {
    // TODO create smth like tickers attr for class and loop through them here
    this.running = true
    if (!this.populUpdateTimerID) {
      this.populUpdateTimerID = setInterval(
        this.updatePopulation, this.populUpdateTick
      )
    }
    if (!this.moveTimerID) {
      this.moveTimerID = setInterval(this.moveCreatures, this.moveTick)
    }

    if (!this.fieldColorUpdateTimerID && this.props.type === "directional") {
      this.fieldColorUpdateTimerID = setInterval(
        this.updateFieldColor, this.fieldColorUpdateTick,
      )
    }
  }

  stop() {
    this.running = false
    clearInterval(this.populUpdateTimerID)
    clearInterval(this.moveTimerID)
    clearInterval(this.fieldColorUpdateTimerID)
    delete this.populUpdateTimerID
    delete this.moveTimerID
    delete this.fieldColorUpdateTimerID
  }

  killCreature(creatureIndex) {
    if (!this.running) {return}
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
          creatures.push(newCr)
          offspringCounter += 1
        }
      }
      return {
        'creatures': creatures,
        'history': prevState.history.concat([this.histGenerator(creatures)]),
      }
    })
  }

  moveCreatures() {
    this.setState((prevState, props) => {
      const creatures = prevState.creatures
      const newCreatures = []
      for (let creature of creatures) {
        newCreatures.push(moveCreature(this.width, this.height, creature))
      }
      return {'creatures': newCreatures}
    })
  }

  updateFieldColor() {
    // TODO maybe change not all the way to max value
    this.setState((prevState, props) => {
      const updateIncrement = .01
      const maxVal = this.colorScale.domain()[1]
      if (prevState.fieldColorVal >= maxVal) {return}
      return {
        fieldColorVal:
          prevState.fieldColorVal + this.colorScale.domain()[1] * updateIncrement
      }
    })
  }

  render() {
    const creatures = this.state.creatures.map(
      creature => <Creature key={creature.id}
        colorScale={this.colorScale} creature={creature}
        kill={this.killCreature}/>
    )
    return (<div className="simulation-container">
      <h2 className="ui header">{this.props.title}</h2>
      <GameControls start={this.start} stop={this.stop}/>
      <div className="simulation-components">
        {/* TODO move this svg to separate component */}
        <svg width={this.width} height={this.height} className='simulation'
          onDragStart={(e) => e.preventDefault()}>
          <FieldBackground width={this.width} height={this.height}
            type={this.props.type} colorScale={this.colorScale}
            colorVal={this.state.fieldColorVal}/>
          <g className="creatures-layer">
            {creatures}
          </g>
          <Obstacles width={this.width} height={this.height} type={this.props.type} />
        </svg>
        <CreatureDistribution data={this.state.history} width={180}
          colorScale={this.colorScale}/>
      </div>
    </div>)
  }
}


class Creature extends Component {
  render() {
    const data = this.props.creature
    const coords = data.coords
    return (
      <circle cx={coords.x} cy={coords.y} r={data.radius}
        fill={this.props.colorScale(data.phenotype)}
        onClick={() => this.props.kill(data.id)}/>
    )
  }
}


function GameControls(props) {
  return (
    <div className='simulation-controls'>
      <button onClick={props.start} className="ui labeled icon button">
       Старт<i className="play icon"></i>
      </button>
      <button onClick={props.stop} className="ui labeled icon button">
       Стоп<i className="stop icon"></i>
      </button>
    </div>
  )
}


export default App;
