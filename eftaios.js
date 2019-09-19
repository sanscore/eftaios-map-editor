'use strict';
var drawing;
var dragging = false

const legend = {
};

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

  toLink() {
    return grid.map(h => h.toSymbol()).join('');
  },

  fromLink(str) {
    // assert gridArray.length == grid.length
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

  toJSON() {
    return grid;
  },

  fromJSON(str) {
    // assert gridArray.length == grid.length
    nullifyGrid();

    const gridArray = JSON.parse(str)
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

    this.origHighlight = this.polygon.find('.highlight').fill()[0];

    this.polygon
      .on('mouseenter', () => {
        if (!dragging) {
          if (this.origHighlight != null) {
            this.polygon.find('.highlight').fill({opacity: 1.0, color: 'aqua'});
          }
          this.polygon.front().animate(500).transform({scale: 1.2});
        }
      })
      .on('mouseleave', () => {
        if (this.origHighlight != null) {
          this.polygon.find('.highlight').fill(this.origHighlight);
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
      .addClass("paintable");
    blankGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill('none')
      .attr({'pointer-events': 'visible'})
      .opacity(0.8)
      .addClass('highlight');

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
      .addClass("paintable");
    silentGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill({opacity: 1, color: '#fff'})
      .stroke({ width: 2, color: '#838383' })
      .addClass('highlight');
    silentGroup.text('A01')
      .font({
        family: 'Share Tech Mono',
        size: 16,
        anchor: 'middle',
        leading: 1.4,
        fill: '#000',
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
      .addClass("paintable");
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
      .addClass('highlight');
    dangerGroup.text('A01')
      .font({
        family: 'Share Tech Mono',
        size: 16,
        anchor: 'middle',
        leading: 1.4,
        fill: '#000',
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
      .addClass("draggable");
    humanGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill({opacity: 1, color: '#000'})
      .stroke({ width: 2, color: '#838383' })
      .addClass('highlight');
    humanGroup.path("M18 7 L13 10 V30 L25 38 L37 30 V10 L32 7")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'});
    humanGroup.path("M13 18 L25 25 L37 18")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'});
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
      .addClass("draggable");

    alienGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill({opacity: 1, color: '#000'})
      .stroke({ width: 2, color: '#838383' })
      .addClass('highlight');

    alienGroup.path("M13 7 L37 20 V34 L25 27 L13 34 V20 L37 7")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'});
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
      .addClass("draggable");

    podGroup.polygon(Hex().corners().map(({ x, y }) => `${x},${y}`).join(' '))
      .translate(1,1)
      .fill({opacity: 1, color: '#000'})
      .stroke({ width: 2, color: '#838383' })
      .addClass('highlight');

    podGroup.path("M32 5 H16 L8.5 18")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'});

    podGroup.path("M18 38 H34 L41.5 25")
      .translate(1,1)
      .fill('none')
      .stroke({width:3, color:'#fff'});

    podGroup.text(n)
      .font({
        family: 'Share Tech Mono',
        size: 24,
        anchor: 'middle',
        leading: 1.4,
        fill: '#fff',
        weight: 'bold',
      })
      .center(26,24);
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
  },
})

const drawWidth = gridDetails.offsetX + gridDetails.pxWidth;
const drawHeight = gridDetails.offsetY + gridDetails.pxHeight + gridDetails.footerHeight;
const draw = SVG().size(drawWidth, drawHeight);

function createMap(draw) {
  const diagnol_pattern = draw.pattern(24, 24, function(add) {
    add.line(11, -1, 36, 24).stroke({ color: '#838383', width: 1 })
    add.line(-1, 11, 24, 36).stroke({ color: '#838383', width: 1 })
  });

  const cols = draw.group().id('cols')
  for(let i = 0, j = 32; i < gridDetails.xpos.length; ++i, j+=37.5) {
    // TODO: move text/font details to a style
    cols
      .text(gridDetails.xpos[i])
      .font({
        family: 'Share Tech Mono',
        size: 16,
        anchor: 'middle',
        fill: '#838383',
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
    });
  controls.text('Danger')
    .move(0,20)
    .on('click', () => {
      gridDetails.fillDanger();
    });
  controls.text('Clear')
    .move(0,40)
    .on('click', () => {
      gridDetails.fillBlank();
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
  // TODO: issue w/ Fx, SVG.JS;
  //    OR, issue with moving legend hexes from legend rect
  //legendGroup.ungroup(draw);
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
  gridDetails.humanHex = null
  gridDetails.alienHex = null
  gridDetails.pod1Hex = null
  gridDetails.pod2Hex = null
  gridDetails.pod3Hex = null
  gridDetails.pod4Hex = null
}

function nullifyHex(hex) {
  if (hex != null) {
    switch(hex) {
      case gridDetails.humanHex:
        gridDetails.humanHex = null;
        break;
      case gridDetails.alienHex:
        gridDetails.alienHex = null;
        break;
      case gridDetails.pod1Hex:
        gridDetails.pod1Hex  = null;
        break;
      case gridDetails.pod2Hex:
        gridDetails.pod2Hex  = null;
        break;
      case gridDetails.pod3Hex:
        gridDetails.pod3Hex  = null;
        break;
      case gridDetails.pod4Hex:
        gridDetails.pod4Hex  = null;
        break;
    }
  }
}

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
        if (paint){ 
          clone.find('.highlight')
            .fill('orange');
        }

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
      // TODO: disable legend polygons if they are placed on map.
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
