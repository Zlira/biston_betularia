// a polygene looks like this
// {
//   'loc1': [0, 0],
//   'loc2': [1, 1],
//   'loc3': [0, 1],
// }
import {sum} from 'd3-array'

// TODO move to some kind of utils
function randomChoice(options) {
  return options[Math.round(Math.random() * (options.length - 1))]
}


function getRandomPolygeneGenotype() {
  const options = [0, 1]
  return [randomChoice(options), randomChoice(options)]
}


function getRandomPolygenes(polygenesNum) {
  const polygenes = {}
  for (let i=1; i <= polygenesNum; i++) {
    polygenes['loc' + i] = getRandomPolygeneGenotype()
  }
  return polygenes
}

function polygenesToPhenotype(polygenes) {
  return sum(Object.values(polygenes), d => sum(d))
}

function polygeneOffspring(polygene1, polygene2) {
  return [randomChoice(polygene1), randomChoice(polygene2)]
}

function polygenesOffspring(polygenes1, polygenes2) {
  const offspring = {}
  for (let [locName, alleles] of Object.entries(polygenes1)) {
    offspring[locName] = polygeneOffspring(alleles, polygenes2[locName])
  }
  return offspring
}

export {getRandomPolygenes, polygenesToPhenotype, polygenesOffspring}
