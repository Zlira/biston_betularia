function randomChoice(options) {
  return options[Math.round(Math.random() * (options.length - 1))]
}

export {randomChoice}
