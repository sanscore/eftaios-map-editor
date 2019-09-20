// TODO: add map name
// TODO: add movement grid
// TODO: fix diagnol_pattern
// TODO: impl print
// TODO: impl save to PNG, PDF (Print to PDF?)
//    convert map to canvas, toDataURL()
'use strict';
var drawing;
var dragging = false

const legend = {};

const PolygonType = {
  NONE: 'none',
  SILENT: 'silent',
  DANGER: 'danger',
  HUMAN: 'human',
  ALIEN: 'alien',
  POD1: 'pod1',
  POD2: 'pod2',
  POD3: 'pod3',
  POD4: 'pod4',
}

const sqrt3 = Math.sqrt(3)
const padding = 2

const gridDetails = { // TODO: change to something... so that hexSize is configurable. gridWrapper?
  hexSize:       25,
  hexWidth:      23,
  hexHeight:     14,
  footerTop:     20 + (25 * sqrt3 * (14 + 0.5) + padding) + 2 * padding, // 20=offsetY, (...)=pxHeight
  footerHeight:  100,
  pxWidth:       (25/2) * (23*3+1) + padding,        // 25=hexSize, 23=hexWidth
  pxHeight:      25 * sqrt3 * (14 + 0.5) + padding,  // 25=hexSize, 14=hexHeight
  offsetX:       0,
  offsetY:       20,
  humanHex:      null,
  alienHex:      null,
  pod1Hex:       null,
  pod2Hex:       null,
  pod3Hex:       null,
  pod4Hex:       null,

  xpos: [   // TODO: turn into function, int to char
    "A", "B", "C", "D", "E", "F",
    "G", "H", "I", "J", "K", "L",
    "M", "N", "O", "P", "Q", "R",
    "S", "T", "U", "V", "W",
  ],

  ypos: [   // TODO: turn into function, 2-digit leading 0
    "01", "02", "03", "04", "05", "06",
    "07", "08", "09", "10", "11", "12",
    "13", "14",
  ],

  toDataImg() {
    // TODO: why do we have 2 SVG elements?
    // TODO: Text doesn't use Share Tech Mono
    let xml = new XMLSerializer().serializeToString(document.querySelectorAll('svg')[1]);
    console.log(xml)
    let svg = new Blob([xml], {type: "image/svg+xml;charset=utf-8"});

    let DOMURL = self.URL || self.webkitURL || self;
    let url = DOMURL.createObjectURL(svg);

    let canvas = document.querySelector('canvas');
    let ctx = canvas.getContext('2d')

    let img = new Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0);
      var png = canvas.toDataURL("image/png");
      document.querySelector('#png').innerHTML = '<img src="'+png+'"/>';
      DOMURL.revokeObjectURL(png);
    }
    img.src = url;
  },

  toLink() {
    return grid.map(h => h.toSymbol()).join('');
  },

  fromLink(str) {
    if (grid.length != str.length) {
      return;
    }
    nullifyGrid();

    const gridArray = str.split('');
    for(let i = 0; i < gridArray.length; ++i) {
      let code = gridArray[i];
      let hex = grid.get(i);
      switch(code) {
        case '_':
          hex.blank();
          break;
        case 's':
          hex.silent();
          break;
        case 'd':
          hex.danger();
          break;
        case 'h':
          hex.human();
          break;
        case 'a':
          hex.alien();
          break;
        case '1':
          hex.pod1();
          break;
        case '2':
          hex.pod2();
          break;
        case '3':
          hex.pod3();
          break;
        case '4':
          hex.pod4();
          break;
        default:
      }
    }
  },

  loadLink() {
    gridDetails.fromLink(window.location.hash.substring(1));
  },

  toJSON() {
    return grid;
  },

  fromJSON(str) {
    const gridArray = JSON.parse(str)
    if (grid.length != gridArray.length) {
      return;
    }

    nullifyGrid();
    for(let i = 0; i < gridArray.length; ++i) {
      let [ x, y, type ] = gridArray[i]
      let hex = grid.get([x, y])
      let point = hex.toPoint()
      hex.setType(type);
    }
  },

  fillBlank() {
    nullifyGrid();

    for(let i = 0; i < grid.length; ++i) {
      let hex = grid.get(i)
      hex.blank();
    }
  },

  fillSilent() {
    nullifyGrid();

    for(let i = 0; i < grid.length; ++i) {
      let hex = grid.get(i)
      hex.silent();
    }
  },

  fillDanger() {
    nullifyGrid();

    for(let i = 0; i < grid.length; ++i) {
      let hex = grid.get(i)
      hex.danger();
    }
  },
}

function Polygon() {
  this.polygon;
  this.type = PolygonType.NONE;

  this.setCoordinates = (x, y) => {
    this.polygon
      .find('text.coordinates')
      .text(`${gridDetails.xpos[x]}${gridDetails.ypos[y]}`);
    return this;
  };

  this.addTo = (group) => {
    this.polygon.addTo(group);
    return this;
  };

  this.center = (x,y) => {
    this.polygon.center(x,y);
    return this;
  };

  this.translate = (x,y) => {
    this.polygon.translate(x,y);
    return this;
  };

  this.id = (name) => {
    this.polygon.id(name);
    return this;
  };

  this.show = () => {
    this.polygon.show();
    return this;
  };

  this.addEvents = () => {
    if (this.polygon == null) {
      return this;
    }

    this.polygon
      .on('mouseenter', () => {
        if (!dragging) {
          let hiColor = this.polygon.data('hi-color');
          if (hiColor != null) {
            this.polygon.find('.highlight-fill').fill({opacity: 1.0, color: hiColor});
            this.polygon.find('.highlight-stroke').stroke(hiColor);
          }
          this.polygon.front().animate(500).transform({scale: 1.2});
        }
      })
      .on('mouseleave', () => {
        let baseColor = this.polygon.data('base-color');
        if (baseColor != null) {
          this.polygon.find('.highlight-fill').fill(baseColor);
          this.polygon.find('.highlight-stroke').stroke(baseColor);
        }
        this.polygon.animate(250).transform({scale: 1});
      })

    return this;
  }

  this.blank = () => {
    this.type = PolygonType.NONE;
    this.remove();

    const blankGroup = draw.group()
      .addClass('blank')
      .addClass("draggable")
      .addClass("paintable")
      .data('base-color', 'none')
      .data('hi-color', 'aqua');
    blankGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill('none')
      .attr({'pointer-events': 'visible'})
      .opacity(0.8)
      .addClass('highlight-fill');

    this.polygon = blankGroup;
    this.addEvents();
    return this;
  }

  this.silent = () => {
    this.type = PolygonType.SILENT;
    this.remove();

    const silentGroup = draw.group()
      .addClass('silent')
      .addClass("draggable")
      .addClass("paintable")
      .data('base-color', '#fff')
      .data('hi-color', 'aqua');
    silentGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill({opacity: 1, color: '#fff'})
      .stroke({ width: 2, color: '#838383' })
      .addClass('highlight-fill');
    silentGroup.text('A01')
      .font({
        anchor: 'middle',
        fill: '#000',
        size: 16,
      })
      .center(26,25)
      .addClass('coordinates');
    silentGroup.hide();

    this.polygon = silentGroup;
    this.addEvents();
    return this;
  }

  this.danger = () => {
    this.type = PolygonType.DANGER;
    this.remove();

    // TODO: rm
    const exampleHex = Hex()
    const exampleHexCenter = exampleHex.center().add(exampleHex.toPoint())

    const dangerGroup = draw.group()
      .addClass('danger')
      .addClass("draggable")
      .addClass("paintable")
      .data('base-color', '#ddd')
      .data('hi-color', 'aqua');
    dangerGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill('#838383')
      .stroke({width: 2, color: '#838383'});
    dangerGroup.polygon([
      [4,0],        [6,0],        [7,sqrt3],    [9,sqrt3],   [10,sqrt3*2],
      [9,sqrt3*3],  [10,sqrt3*4], [9,sqrt3*5],  [7,sqrt3*5], [6,sqrt3*6],
      [4, sqrt3*6], [3,sqrt3*5],  [1, sqrt3*5], [0,sqrt3*4], [1,sqrt3*3],
      [0,sqrt3*2],  [1,sqrt3],    [3,sqrt3]
    ])
      .translate(1,1)
      .fill('#ddd')
      .size(38)
      .center(exampleHexCenter.x,exampleHexCenter.y)
      .addClass('highlight-fill');
    dangerGroup.text('A01')
      .font({
        anchor: 'middle',
        fill: '#000',
        size: 16,
      })
      .center(26,25)
      .addClass('coordinates');
    dangerGroup.hide();

    this.polygon = dangerGroup;
    this.addEvents();
    return this;
  }

  this.human = () => {
    this.type = PolygonType.HUMAN;
    this.remove();

    const humanGroup = draw.group()
      .addClass('human')
      .addClass("draggable")
      .data('base-color', '#fff')
      .data('hi-color', 'orange');

    humanGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill({opacity: 1, color: '#000'})
      .stroke({ width: 2, color: '#838383' });

    humanGroup.path("M18 7 L13 10 V30 L25 38 L37 30 V10 L32 7")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'})
      .addClass('highlight-stroke');

    humanGroup.path("M13 18 L25 25 L37 18")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'})
      .addClass('highlight-stroke');
    humanGroup.hide();

    this.polygon = humanGroup;
    this.addEvents();
    return this;
  }

  this.alien = () => {
    this.type = PolygonType.ALIEN;
    this.remove();

    const alienGroup = draw.group()
      .addClass('alien')
      .addClass("draggable")
      .data('base-color', '#fff')
      .data('hi-color', 'orange');

    alienGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill({opacity: 1, color: '#000'})
      .stroke({ width: 2, color: '#838383' });

    alienGroup.path("M13 7 L37 20 V34 L25 27 L13 34 V20 L37 7")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'})
      .addClass('highlight-stroke');
    alienGroup.hide();

    this.polygon = alienGroup;
    this.addEvents();
    return this;
  }

  this.pod = (n) => {
    this.remove();

    // TODO: legendPods; text position _very_ screwy when moved.
    // TODO: hexPods; text position _little_ screwy when moved.
    const podGroup = draw.group()
      .addClass(`pod`)
      .addClass(`pod${n}`)
      .addClass("draggable")
      .data('base-color', '#fff')
      .data('hi-color', 'orange');

    podGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill({opacity: 1, color: '#000'})
      .stroke({ width: 2, color: '#838383' });

    podGroup.path("M32 5 H16 L8.5 18")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'})
      .addClass('highlight-stroke');

    podGroup.path("M18 38 H34 L41.5 25")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'})
      .addClass('highlight-stroke');

    podGroup.text(n)
      .font({
        anchor: 'middle',
        fill: '#fff',
        size: 24,
      })
      .center(26,24)
      .addClass('highlight-fill');
    podGroup.hide();

    this.polygon = podGroup;
    this.addEvents();
    return this;
  }

  this.pod1 = () => {
    this.type = PolygonType.POD1;
    return this.pod("1");
  }

  this.pod2 = () => {
    this.type = PolygonType.POD2;
    return this.pod("2");
  }

  this.pod3 = () => {
    this.type = PolygonType.POD3;
    return this.pod("3");
  }

  this.pod4 = () => {
    this.type = PolygonType.POD4;
    return this.pod("4");
  }

  this.remove = () => {
    if (this.polygon != null) {
      this.polygon.remove();
    };

    return this;
  }
}

const Hex = Honeycomb.extendHex({
  size: gridDetails.hexSize,
  orientation: 'flat',

  toJSON() { return [this.x, this.y, this.type()]; },

  toSymbol() {
    switch(this.type()) {
      case PolygonType.SILENT: return 's';
      case PolygonType.DANGER: return 'd';
      case PolygonType.HUMAN: return 'h';
      case PolygonType.ALIEN: return 'a';
      case PolygonType.POD1: return '1';
      case PolygonType.POD2: return '2';
      case PolygonType.POD3: return '3';
      case PolygonType.POD4: return '4';
      default: return '_';
    }
  },

  render(draw) {
    const {x, y} = this.toPoint()
      .add(this.center())
      .add(gridDetails.offsetX, gridDetails.offsetY);
    this.cx = x;
    this.cy = y;

    this.polygon = new Polygon().blank();
    this.polygon
      .addTo(draw)
      .center(this.cx, this.cy)
      .show();
  },

  type() {
    if (this.polygon != null) {
      return this.polygon.type;
    }
    return PolygonType.NONE;
  },

  setType(type) {
    nullifyHex(this);

    switch(type) {
      case PolygonType.NONE:
        this.blank()
        break;
      case PolygonType.SILENT:
        this.silent()
        break;
      case PolygonType.DANGER:
        this.danger()
        break;
      case PolygonType.HUMAN:
        this.human()
        break;
      case PolygonType.ALIEN:
        this.alien()
        break;
      case PolygonType.POD1:
        this.pod1()
        break;
      case PolygonType.POD2:
        this.pod2()
        break;
      case PolygonType.POD3:
        this.pod3()
        break;
      case PolygonType.POD4:
        this.pod4()
        break;
      default:
        throw `Unknown Hex Type: ${type}`
    }

    return this;
  },

  blank() {
    nullifyHex(this);

    this.polygon
      .blank()
      .center(this.cx, this.cy)
      .show();
  },

  silent() {
    this.polygon
      .silent()
      .setCoordinates(this.x, this.y)
      .center(this.cx, this.cy)
      .show();
  },

  danger() {
    this.polygon.danger()
      .setCoordinates(this.x, this.y)
      .center(this.cx, this.cy)
      .show();
  },

  human() {
    if (gridDetails.humanHex != null) {
      return;
    }

    this.polygon
      .human()
      .center(this.cx, this.cy)
      .show();
    gridDetails.humanHex = this;

    legend.human.polygon.off();
    legend.human.polygon.opacity(0.5);
  },

  alien() {
    if (gridDetails.alienHex != null) {
      return;
    }

    this.polygon
      .alien()
      .center(this.cx, this.cy)
      .show();
    gridDetails.alienHex = this;

    legend.alien.polygon.off();
    legend.alien.polygon.opacity(0.5);
  },

  pod1() {
    if (gridDetails.pod1Hex != null) {
      return;
    }

    this.polygon
      .pod1()
      .center(this.cx, this.cy)
      .show();
    gridDetails.pod1Hex = this;

    legend.pod1.polygon.off();
    legend.pod1.polygon.opacity(0.5);
  },

  pod2() {
    if (gridDetails.pod2Hex != null) {
      return;
    }

    this.polygon
      .pod2()
      .center(this.cx, this.cy)
      .show();
    gridDetails.pod2Hex = this;

    legend.pod2.polygon.off();
    legend.pod2.polygon.opacity(0.5);
  },

  pod3() {
    if (gridDetails.pod3Hex != null) {
      return;
    }

    this.polygon
      .pod3()
      .center(this.cx, this.cy)
      .show();
    gridDetails.pod3Hex = this;

    legend.pod3.polygon.off();
    legend.pod3.polygon.opacity(0.5);
  },

  pod4() {
    if (gridDetails.pod4Hex != null) {
      return;
    }

    this.polygon
      .pod4()
      .center(this.cx, this.cy)
      .show();
    gridDetails.pod4Hex = this;

    legend.pod4.polygon.off();
    legend.pod4.polygon.opacity(0.5);
  },
})

const drawWidth = gridDetails.offsetX + gridDetails.pxWidth;
const drawHeight = gridDetails.offsetY + gridDetails.pxHeight + gridDetails.footerHeight;
const draw = SVG().size(drawWidth, drawHeight);
draw.style(`
@font-face {
    font-family: "Share Tech Mono";
    src: url("data:application/font-tff;charset=utf-8;base64,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QHBAmUDlQQ5BNkFPQXRBlkGyQedCI0JgQnxCtUL6AAAAAQAAAAEAxZY/f5pfDzz1AAMD6AAAAADQJIvsAAAAANHI+z3/4v8VA/IDVwAAAAcAAgAAAAAAAAIcAFQCHAAAAhwAAAIcAC0CHAAtAhwALQIcAC0CHAAtAhwALQIcAC0CHAAPAhwAVQIcAG0CHABtAhwAUgIcACICHABnAhwAZwIcAGcCHABnAhwAZwIcAGoCHABeAhwAUAIcAIgCHACIAhwAcgIcAIACHACIAhwAfQIcAFECHABzAhwASwIcADUCHABPAhwATwIcAEYCHABGAhwARgIcAEYCHABGAhwARgIcAEYCHAAaAhwAWgIcAF4CHABGAhwARgIcAGQCHABkAhwAQwIcAE0CHABNAhwATQIcAE0CHABNAhwAOAIcADMCHAAzAhwALAIcACwCHAAsAhwAVwIcAFcCHABDAhwAQwIcAEMCHABDAhwAQwIcAEMCHABDAhwAGQIcAFcCHAB4AhwAeAIcAFQCHABeAhwAXgIcAF4CHABeAhwAXgIcAF4CHABjAhwASAIcAFcCHABQAhwAUAIcAFACHABQAhwAUAIcAFACHACJAhwAYAIcAEYCHABGAhwAKwIcAFcCHABXAhwAUwIcAFMCHABTAhwAUwIcAE8CHABTAhwAUwIcABoCHABXAhwAYQIcAFQCHABkAhwAdgIcAG8CHABOAhwAawIcAF0CHABdAhwAXQIcAF0CHABdAhwAQAIcACMCHABBAhwAPwIcAD8CHAA/AhwAagIcAKcEOABjBDgAYwIcAH0CHACEAhwAMgIcAC0CHABnAhwAZwIcADACHABcAhwAZgIcAGkCHAB5AhwAVwIcAHcCHABhAhwAaAIcAFYCHABgAhwAaQIcAAsCHAALAhwAFQIcAJICHACWAhwAngIcAEYCHAAyAhwA3AIcAMMCHADcAhwAyAIcACgCHADcAhwA3AIcAFACHADcAhwAfgIcAIMCHACRAhwA3gIcAMgCHAAyAhwAEgIcAJMCHACTAhwApQIcAKUCHACqAhwAqgIcACACHABQAhwAawIcAGsCHABwAhwAcAIcAMACHADAAhwAggIcAIICHACCAhwAzwIcAM8CHADPAhwAAAAAAAACHABZAHgADgBpAE8AXAA3AGQAZABQANwAUABQAFAADQBFAFAAUADc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AHkAcABlACAARABlAHMAaQBnAG4ALAAgAFIAYQBsAHAAaAAgAGQAdQAgAEMAYQByAHIAbwBpAHMAIAAoAHAAbwBzAHQAQABjAGEAcgByAG8AaQBzAC4AYwBvAG0AIAB3AHcAdwAuAGMAYQByAHIAbwBpAHMALgBjAG8AbQApACwAIAB3AGkAdABoACAAUgBlAHMAZQByAHYAZQBkACAARgBvAG4AdAAgAE4AYQBtAGUAIAAnAFMAaABhAHIAZQAnAFMAaABhAHIAZQAgAFQAZQBjAGgAIABNAG8AbgBvAFIAZQBnAHUAbABhAHIAUgBhAGwAcABoAE8AbABpAHYAZQByAGQAdQBDAGEAcgByAG8AaQBzADoAIABTAGgAYQByAGUAIABUAGUAYwBoACAATQBvAG4AbwA6ACAAMgAwADEANABWAGUAcgBzAGkAbwBuACAAMQAuADAAMAAzAFMAaABhAHIAZQBUAGUAYwBoAE0AbwBuAG8ALQBSAGUAZwB1AGwAYQByAFIAYQBsAHAAaAAgAE8AbABpAHYAZQByACAAZAB1ACAAQwBhAHIAcgBvAGkAcwBoAHQAdABwADoALwAvAHcAdwB3AC4AYwBhAHIAcgBvAGkAcwAuAGMAbwBtAFQAaABpAHMAIABGAG8AbgB0ACAAUwBvAGYAdAB3AGEAcgBlACAAaQBzACAAbABpAGMAZQBuAHMAZQBkACAAdQBuAGQAZQByACAAdABoAGUAIABTAEkATAAgAE8AcABlAG4AIABGAG8AbgB0ACAATABpAGMAZQBuAHMAZQAsACAAVgBlAHIAcwBpAG8AbgAgADEALgAxAC4AIABUAGgAaQBzACAAbABpAGMAZQBuAHMAZQAgAGkAcwAgAGEAdgBhAGkAbABhAGIAbABlACAAdwBpAHQAaAAgAGEAIABGAEEAUQAgAGEAdAA6ACAAaAB0AHQAcAA6AC8ALwBzAGMAcgBpAHAAdABzAC4AcwBpAGwALgBvAHIAZwAvAE8ARgBMAGgAdAB0AHAAOgAvAC8AcwBjAHIAaQBwAHQAcwAuAHMAaQBsAC4AbwByAGcALwBPAEYATAACAAAAAAAA/5IAMgAAAAEAAAAAAAAAAAAAAAAAAAAAAQwAAAACAAMAJADJAMcAYgCtAGMArgCQACUAJgBkACcA6QAoAGUAyADKAMsAKQAqACsALADMAM0AzgDPAC0ALgAvAOIAMAAxAGYAMgDQANEAZwDTAJEArwCwADMA7QA0ADUANgDkADcAOADUANUAaADWADkAOgA7ADwA6wC7AD0A5gBEAGkAawBsAGoAbgBtAKAARQBGAG8ARwDqAEgAcAByAHMAcQBJAEoASwBMANcAdAB2AHcAdQBNAE4ATwDjAFAAUQB4AFIAeQB7AHwAegChAH0AsQBTAO4AVABVAFYA5QCJAFcAWAB+AIAAgQB/AFkAWgBbAFwA7AC6AF0A5wDAAMEAnQCeAKgAnwCXAQIAmwATABQAFQAWABcAGAAZABoAGwAcALwA9AD1APYA8QDyAPMADQA/AMMAhwAdAA8AqwAEAKMABgARACIAogAFAAoAHgASAEIAXgBgAD4AQAALAAwAswCyABABAwCpAKoAvgC/AMUAtAC1ALYAtwDEAQQAAQEFAIQAvQAHAKYAhQCWAKcAYQC4AQYAIAAhAJUAkgCcAB8AlAEHAKQA7wDwAI8AmAAIAMYADgCTAJoApQCZAQgBCQEKALkBCwEMAQ0BDgEPARABEQESARMBFAEVAF8A6AAjAAkAiACLAIoAhgCMAIMAQQCCAMIAjQDbAOEA3gDYAI4A3ABDAN8A2gDgAN0A2QEWARcBGAd1bmkwM0JDB3VuaTAwQUQHdW5pMDBBMARFdXJvB2RvdG1hdGgKbG9naWNhbGFuZAd1bmkyMjE1B3VuaTIyMTkHdW5pMjIyNAd1bmkyNUFGB3VuaTI2MjAJc21pbGVmYWNlDGludnNtaWxlZmFjZQNzdW4Fc3BhZGUEY2x1YgVoZWFydAdkaWFtb25kC211c2ljYWxub3RlDm11c2ljYWxub3RlZGJsB3VuaTAyQzkGZmVtYWxlBG1hbGUAAAAAAQAB//8ADwABAAAACgBCAFwAA0RGTFQAFGdyZWsAIGxhdG4ALAAEAAAAAP//AAEAAAAEAAAAAP//AAEAAQAEAAAAAP//AAEAAgADY3BzcAAUY3BzcAAUY3BzcAAUAAAAAQAAAAEABAABAAAAAQAIAAEACgAFAAUACgACAAIAAwA/AAAAgwCEAD0AAAABAAAACgBgAPIAA0RGTFQAFGdyZWsAKmxhdG4AQAAEAAAAAP//AAYAAAADAAYACQAMAA8ABAAAAAD//wAGAAEABAAHAAoADQAQAAQAAAAA//8ABgACAAUACAALAA4AEQASYWFsdABuYWFsdABuYWFsdABuZGxpZwB0ZGxpZwB0ZGxpZwB0ZnJhYwB6ZnJhYwB6ZnJhYwB6bGlnYQCAbGlnYQCAbGlnYQCAb3JkbgCGb3JkbgCGb3JkbgCGc3VwcwCMc3VwcwCMc3VwcwCMAAAAAQAAAAAAAQAEAAAAAQACAAAAAQAFAAAAAQADAAAAAQABAAcAEAA+AFYAkgDaANoBAgABAAAAAQAIAAIAFAAHAIEAggCBAIIAlgCXAJgAAQAHAAMAJABAAGIAiQCKAIsAAQAAAAEACAABAAYADQABAAMAiQCKAIsABAAAAAEACAABACwAAgAKACAAAgAGAA4AkwADAKkAigCUAAMAqQCMAAEABACVAAMAqQCMAAEAAgCJAIsABgAAAAIACgAkAAMAAQAsAAEAEgAAAAEAAAAGAAEAAgADAEAAAwABABIAAQAcAAAAAQAAAAYAAgABAIgAkQAAAAEAAgAkAGIABAAAAAEACAABABoAAQAIAAIABgAMAH8AAgBVAIAAAgBdAAEAAQBSAAEAAAABAAgAAgAOAAQAgQCCAIEAggABAAQAAwAkAEAAYgAA");
}

text {font-family: "Share Tech Mono";}
`);

function createMap(draw) {
  const diagnol_pattern = draw.pattern(24, 24, function(add) {
    add.line(11, -1, 36, 24).stroke({ color: '#838383', width: 1 })
    add.line(-1, 11, 24, 36).stroke({ color: '#838383', width: 1 })
  });

  const cols = draw.group().id('cols')
  // TODO: calc j init pos; hixSize?
  for(let i = 0, j = 25; i < gridDetails.xpos.length; ++i, j+=37.5) {
    cols
      .text(gridDetails.xpos[i])
      .font({
        anchor: 'middle',
        fill: '#838383',
        size: 16,
      })
      .center(j, 8)
  }

  draw.rect(gridDetails.pxWidth, gridDetails.pxHeight)
    .fill(diagnol_pattern)
    .move(gridDetails.offsetX, gridDetails.offsetY)
    .id('grid');

  const controls = draw.group()
  controls.text('Silent')
    .move(0,0)
    .on('click', () => {
      gridDetails.fillSilent();
      window.location.hash = '';
    });
  controls.text('Danger')
    .move(0,20)
    .on('click', () => {
      gridDetails.fillDanger();
      window.location.hash = '';
    });
  controls.text('Clear')
    .move(0,40)
    .on('click', () => {
      gridDetails.fillBlank();
      window.location.hash = '';
    });
  controls.text('Share')
    .move(60,0)
    .on('click', () => {
      // TODO: prevent hashchange trigger
      // https://stackoverflow.com/questions/4106702/change-hash-without-triggering-a-hashchange-event
      // TODO: Or, just not touch location.hash??
      window.location.hash = gridDetails.toLink();
    });
  controls.move(0, gridDetails.footerTop);

  const legendGroup = draw.group()
    .id('legend');

  legendGroup.rect(335,60)
    .fill('none')
    .translate(1,1);

  const legendHuman = new Polygon().human()
    .addTo(legendGroup)
    .center(30,30)
    .id('legend_human')
    .show();
  legend.human = legendHuman;

  const legendAlien = new Polygon().alien()
    .addTo(legendGroup)
    .center(85,30)
    .id('legend_alien')
    .show();
  legend.alien = legendAlien;

  const legendPod1 = new Polygon().pod1()
    .addTo(legendGroup)
    .center(140,30)
    .id('legend_pod1')
    .show();
  legend.pod1 = legendPod1;

  const legendPod2 = new Polygon().pod2()
    .addTo(legendGroup)
    .center(195,30)
    .id('legend_pod2')
    .show();
  legend.pod2 = legendPod2;

  const legendPod3 = new Polygon().pod3()
    .addTo(legendGroup)
    .center(250,30)
    .id('legend_pod3')
    .show();
  legend.pod3 = legendPod3;

  const legendPod4 = new Polygon().pod4()
    .addTo(legendGroup)
    .center(305,30)
    .id('legend_pod4')
    .show();
  legend.pod4 = legendPod4;

  legendGroup.move(gridDetails.pxWidth - 340, gridDetails.footerTop);
}
createMap(draw);

const Grid = Honeycomb.defineGrid(Hex)
const grid = Grid.rectangle({
  width: gridDetails.hexWidth,
  height: gridDetails.hexHeight,

  onCreate(hex) {
    hex.render(draw)
  },
})

function evtToHexCoordinates(evt) {
  const dx = evt.pageX - drawing.offsetLeft - gridDetails.offsetX;
  const dy = evt.pageY - drawing.offsetTop - gridDetails.offsetY;
  return Grid.pointToHex([dx, dy]);
}

function evtToHex(evt) {
  const hexCoordinates = evtToHexCoordinates(evt);
  return grid.get(hexCoordinates);
}

function findDraggable(el) {
  if (el == null) { return; }

  if (el.classList != null && el.classList.contains('draggable')) {
    return el;
  } else {
    return findDraggable(el.parentNode);
  }
}

function evtToPolygon(evt) {
  const hex = evtToHex(evt);
  if (hex != null) {
    return hex.polygon;
  }

  const draggable = findDraggable(evt.target);
  if (draggable != null) {
    switch(draggable) {
      case legend.human.polygon.node: return legend.human;
      case legend.alien.polygon.node: return legend.alien;
      case legend.pod1.polygon.node: return legend.pod1;
      case legend.pod2.polygon.node: return legend.pod2;
      case legend.pod3.polygon.node: return legend.pod3;
      case legend.pod4.polygon.node: return legend.pod4;
    }
  }
}

function nullifyGrid() {
  nullifyHex(gridDetails.humanHex);
  nullifyHex(gridDetails.alienHex);
  nullifyHex(gridDetails.pod1Hex);
  nullifyHex(gridDetails.pod2Hex);
  nullifyHex(gridDetails.pod3Hex);
  nullifyHex(gridDetails.pod4Hex);
}

function nullifyHex(hex) {
  if (hex != null) {
    switch(hex) {
      case gridDetails.humanHex:
        gridDetails.humanHex = null;

        legend.human.addEvents();
        legend.human.polygon.opacity(1);
        break;
      case gridDetails.alienHex:
        gridDetails.alienHex = null;

        legend.alien.addEvents();
        legend.alien.polygon.opacity(1);
        break;
      case gridDetails.pod1Hex:
        gridDetails.pod1Hex = null;

        legend.pod1.addEvents();
        legend.pod1.polygon.opacity(1);
        break;
      case gridDetails.pod2Hex:
        gridDetails.pod2Hex = null;

        legend.pod2.addEvents();
        legend.pod2.polygon.opacity(1);
        break;
      case gridDetails.pod3Hex:
        gridDetails.pod3Hex = null;

        legend.pod3.addEvents();
        legend.pod3.polygon.opacity(1);
        break;
      case gridDetails.pod4Hex:
        gridDetails.pod4Hex = null;

        legend.pod4.addEvents();
        legend.pod4.polygon.opacity(1);
        break;
    }
  }
}

window.addEventListener('hashchange', gridDetails.loadLink, false);

document.addEventListener('DOMContentLoaded', function(loadEvent) {
  function isDraggable(el) {
    return el.classList.contains('draggable')
  }

  function isPaintable(el) {
    return el.classList.contains('paintable')
  }

  function makeDraggable(svg) {
    svg.addEventListener('mousedown', startDrag);
    svg.addEventListener('mousemove', drag);
    svg.addEventListener('mouseup', endDrag);
    svg.addEventListener('mouseleave', endDrag);
    // TODO: limit to left-click

    function getMousePosition(evt) {
      var CTM = svg.getScreenCTM();
      return {
        x: (evt.clientX - CTM.e) / CTM.a,
        y: (evt.clientY - CTM.f) / CTM.d
      };
    }

    var downHex, upHex;
    var originalHex, original, clone, offset;
    var paint = false;

    function startDrag(evt) {
      downHex = evtToHex(evt);

      originalHex = evtToHex(evt);
      original = evtToPolygon(evt);

      // remove old clone, if left behind.
      draw.find('#clone').remove();

      if (original != null && isDraggable(original.polygon.node)) {
        dragging = true
        paint = isPaintable(original.polygon.node);

        original.polygon.transform({scale: 1});

        clone = original.polygon.clone();
        clone.hide()
          .id('clone')
          .addTo(draw);

        let mouseLoc = getMousePosition(evt);
        offset = {
          x: original.polygon.cx() - mouseLoc.x,
          y: original.polygon.cy() - mouseLoc.y,
        };
      }
    }

    function drag(evt) {
      if (dragging) {
        clone.show()

        let hoverHex = evtToHex(evt);
        if (hoverHex != null) {
          if (paint) {
            hoverHex.setType(original.type);
          }
          const {x, y} = hoverHex.toPoint()
            .add(hoverHex.center())
            .add(gridDetails.offsetX, gridDetails.offsetY);
          clone
            .center(x,y)
            .front()
            .find('text.coordinates')
            .text(`${gridDetails.xpos[hoverHex.x]}${gridDetails.ypos[hoverHex.y]}`);
        } else {
          let mouseLoc = getMousePosition(evt);
          clone.center(mouseLoc.x + offset.x, mouseLoc.y + offset.y);
        }
      }
    }

    function endDrag(evt) {
      upHex = evtToHex(evt);
      if (downHex != null && upHex != null && downHex == upHex) {
        // TODO: drag/drop a paint element onto its original hex will "click"
        // the hex. impl dragDistance?? if (dragDistance < 25) {}
        hexClick(evt);
      } else {
        if (clone != null) {
          if (!paint) {
            let hoverHex = evtToHex(evt);
            let originalType = original.type
            if (hoverHex != null) {
              if (originalHex != null) {
                originalHex.blank();
              } else {
                nullifyHex(hoverHex);
              }
              hoverHex.setType(originalType);
            }
          }
        }
      }
      if (clone != null) {
        clone.remove();
        clone = null;
      }
      dragging = false;
    }

    function hexClick(evt) {
      if (downHex != null && upHex != null && downHex != upHex) {
        console.log('wtf?');
        return;
      }

      if (upHex) {
        switch(upHex.type()){
          case PolygonType.NONE:
            upHex.silent();
            break;
          case PolygonType.SILENT:
            upHex.danger();
            break;
          default:
            upHex.blank();
            break;
        }
      }
    }
  }

  drawing = document.getElementById('drawing');
  draw.addTo(drawing);
  makeDraggable(draw.node);
}, false);
