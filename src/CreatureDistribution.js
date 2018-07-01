import React, { Component } from 'react';

import {scaleLinear} from 'd3-scale';
import {sum} from 'd3-array';

class CreatureDistribution extends Component {
  constructor(props) {
    super(props)
    this.state = {historyIndex: 0}

    this.handleChange = this.handleChange.bind(this)
  }

  handleChange(event) {
    this.setState({historyIndex: event.target.value})
  }

  render() {
    const height = 100
    const width = this.props.width
    const latestHist = this.props.data[this.state.historyIndex]
    const binsNum = latestHist.length
    const rectWidth = width / binsNum
    const totCount = sum(latestHist, d => d.length)
    // TODO improve scale to be consistent and nice
    const yScale = scaleLinear().range([0, height]).domain([0, .5])
    const rects = latestHist.map(
      (d, i) => <rect key={d.x0} x={i * rectWidth}
                 y={height - yScale(d.length / totCount)}
                 width={rectWidth} height={yScale(d.length / totCount)}
                 fill={this.props.colorScale(i)} />
    )
    return (
      <div className="creature-distribution">
        <svg width={width} height={height} onDragStart={(e) => e.preventDefault()}>
          {rects}
        </svg>
        <input type="range" style={{width: width}} min="0"
          max={this.props.data.length - 1} value={this.state.historyIndex}
         onChange={this.handleChange}/>
      </div>
    )
  }
}

export {CreatureDistribution}
