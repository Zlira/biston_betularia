function* pairs(creatures) {
  const paired = new Set()
  let pair
  for (let i=0; i < creatures.length; i++) {
    if (!paired.has(i)) {
      pair = searchForPair(i)
      if (pair) {yield pair}
    }
  }

  function searchForPair(i) {
    let dist, cr1, cr2
    for (let j=i+1; j < creatures.length; j++) {
      if (!paired.has(j)) {
        cr1 = creatures[i]
        cr2 = creatures[j]
        dist = getDistance(cr1, cr2)
        if (dist < cr1.radius + cr2.radius) {
          paired.add(i)
          paired.add(j)
          return [cr1, cr2]
        }
      }
    }
  }
}

function getDistance(cr1, cr2) {
  const coords1 = cr1.coords
  const coords2 = cr2.coords
  return Math.sqrt(
    Math.abs(coords1.x - coords2.x) ** 2 +
    Math.abs(coords1.y - coords2.y) ** 2
  )
}


export {pairs}
