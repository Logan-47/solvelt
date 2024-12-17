class Puzzle {
  /*
      params contains :

  container : mandatory - given by id (string) or element
              it will not be resized in this script

  ONLY ONE Puzzle object should be instanced.
      only "container is mandatory, nbPieces and pictures may be provided to get
      initial default values.
      Once a puzzle is solved (and event if not solved) another game can be played
      by changing the image file or the number of pieces, NOT by invoking new Puzzle
  */

  constructor(params) {

    // const puzzle = new Puzzle({ container: "forPuzzle", events });
    this.puzzleIns = this;
    this.autoStart = false;
    const events = params.events;
    this.container = (typeof params.container == "string") ?
      document.getElementById(params.container) :
      params.container;

    /* the following code will add the event Handlers several times if
      new Puzzle objects are created with same container.
      the presence of previous event listeners is NOT detectable
    */
    this.container.addEventListener("mousedown", event => {
      event.preventDefault();
      events.push({ event: 'touch', position: this.relativeMouseCoordinates(event) });
    });

    this.container.addEventListener("touchstart", event => {
      event.preventDefault();
      if (event.touches.length != 1) return;
      let ev = event.touches[0];
      events.push({ event: 'touch', position: this.relativeMouseCoordinates(ev) });
    }, { passive: false });

    this.container.addEventListener("mouseup", event => {
      event.preventDefault();
      handleLeave();
    });
    this.container.addEventListener("touchend", handleLeave);
    this.container.addEventListener("touchleave", handleLeave);
    this.container.addEventListener("touchcancel", handleLeave);

    this.container.addEventListener("mousemove", event => {
      event.preventDefault();
      // do not accumulate move events in events queue - keep only current one
      if (events.length && events[events.length - 1].event == "move") events.pop();
      events.push({ event: 'move', position: this.relativeMouseCoordinates(event) })
    });
    this.container.addEventListener("touchmove", event => {
      event.preventDefault();
      if (event.touches.length != 1) return;
      let ev = event.touches[0];
      // do not accumulate move events in events queue - keep only current one
      if (events.length && events[events.length - 1].event == "move") events.pop();
      events.push({ event: 'move', position: this.relativeMouseCoordinates(ev) });
    }, { passive: false });

    /* create canvas to contain picture - will be styled later */
    this.gameCanvas = document.createElement('CANVAS');
    this.container.appendChild(this.gameCanvas)

    this.srcImage = new Image();
    this.imageLoaded = false;
    this.srcImage.addEventListener("load", () => imageLoaded(this, events, "srcImageLoaded"));

    function handleLeave() {
      events.push({ event: 'leave' }); //
    }

  }

  getContainerSize() {
    let styl = window.getComputedStyle(this.container);
    this.contWidth = parseFloat(styl.width);
    this.contHeight = parseFloat(styl.height);
  }

  create() {

    this.container.innerHTML = "";

    /* define the number of rows / columns to have almost square pieces
      and a total number as close as possible to the requested number
    */
    this.getContainerSize();
    this.computenxAndny();
    /* assuming the width of pieces is 1, computes their height
         (computenxAndny aims at making relativeHeight as close as possible to 1)
    */
    this.relativeHeight = (this.srcImage.naturalHeight / this.ny) / (this.srcImage.naturalWidth / this.nx);

    this.defineShapes({ coeffDecentr: 0.12, twistf: rotation });

    this.polyPieces = [];
    this.pieces.forEach(row => row.forEach(piece => {
      this.polyPieces.push(new PolyPiece(piece, this.puzzleIns));
    }));

    arrShuffle(this.polyPieces);
    this.evaluateZIndex();

  }

  /* computes the number of lines and columns of the puzzle,
    finding the best compromise between the requested number of pieces
    and a square shap for pieces
    result in this.nx and this.ny;
  */

  computenxAndny() {

    let kx, ky, width = this.srcImage.naturalWidth, height = this.srcImage.naturalHeight, npieces = this.nbPieces;
    let err, errmin = 1e9;
    let ncv, nch;

    // horizontal & vertical
    let nHPieces = Math.round(Math.sqrt(npieces * width / height));
    let nVPieces = Math.round(npieces / nHPieces);


    for (ky = 0; ky < 5; ky++) {
      ncv = nVPieces + ky - 2;
      for (kx = 0; kx < 5; kx++) {
        nch = nHPieces + kx - 2;
        err = nch * height / ncv / width;
        err = (err + 1 / err) - 2; // error on pieces dimensions ratio)
        err += Math.abs(1 - nch * ncv / npieces); // adds error on number of pieces

        if (err < errmin) { // keep smallest error
          errmin = err;
          this.nx = nch;
          this.ny = ncv;
        }
      } 
    } 

  }

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  defineShapes(shapeDesc) {
    // define shapes as if the width and height of a piece were 1

    /* first, place the corners of the pieces
      at some distance of their theoretical position, except for edges
    */

    let { coeffDecentr, twistf } = shapeDesc;

    const corners = [];
    const nx = this.nx, ny = this.ny;
    let np;

    for (let ky = 0; ky <= ny; ++ky) {
      corners[ky] = [];
      for (let kx = 0; kx <= nx; ++kx) {
        corners[ky][kx] = new Point(kx + randomNumber(-coeffDecentr, coeffDecentr),
          ky + randomNumber(-coeffDecentr, coeffDecentr));
        if (kx == 0) corners[ky][kx].x = 0;
        if (kx == nx) corners[ky][kx].x = nx;
        if (ky == 0) corners[ky][kx].y = 0;
        if (ky == ny) corners[ky][kx].y = ny;
      } // for kx
    } // for ky

    // Array of pieces
    this.pieces = [];
    for (let ky = 0; ky < ny; ++ky) {
      this.pieces[ky] = [];
      for (let kx = 0; kx < nx; ++kx) {
        this.pieces[ky][kx] = np = new Piece(kx, ky);
        // top side
        if (ky == 0) {
          np.ts.points = [corners[ky][kx], corners[ky][kx + 1]];
          np.ts.type = "d";
        } else {
          np.ts = this.pieces[ky - 1][kx].bs.reversed();
        }
        // right side
        np.rs.points = [corners[ky][kx + 1], corners[ky + 1][kx + 1]];
        np.rs.type = "d";
        if (kx < nx - 1) {
          if (randomInteger(2)) // randomly twisted on one side of the side
            twistf(np.rs, corners[ky][kx], corners[ky + 1][kx]);
          else
            twistf(np.rs, corners[ky][kx + 2], corners[ky + 1][kx + 2]);
        }
        // left side
        if (kx == 0) {
          np.ls.points = [corners[ky + 1][kx], corners[ky][kx]];
          np.ls.type = "d";
        } else {
          np.ls = this.pieces[ky][kx - 1].rs.reversed()
        }
        // bottom side
        np.bs.points = [corners[ky + 1][kx + 1], corners[ky + 1][kx]];
        np.bs.type = "d";
        if (ky < ny - 1) {
          if (randomInteger(2)) // randomly twisted on one side of the side
            twistf(np.bs, corners[ky][kx + 1], corners[ky][kx]);
          else
            twistf(np.bs, corners[ky + 2][kx + 1], corners[ky + 2][kx]);
        }
      } // for kx
    } // for ky

  } // Puzzle.defineShapes

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  scale() {

    // we suppose we want the picture to fill 90% on width or height and less or same on other dimension
    // this 90% might be changed and depend on the number of columns / rows.

    const maxWidth = 0.70 * this.contWidth;
    const maxHeight = 0.70 * this.contHeight;

    // suppose image fits in height
    this.gameHeight = maxHeight;
    this.gameWidth = this.gameHeight * this.srcImage.naturalWidth / this.srcImage.naturalHeight;

    if (this.gameWidth > maxWidth) { // too wide, fits in width
      this.gameWidth = maxWidth;
      this.gameHeight = this.gameWidth * this.srcImage.naturalHeight / this.srcImage.naturalWidth;
    }
    /* get a scaled copy of the source picture into a canvas */
    //    this.gameCanvas = document.createElement('CANVAS');
    this.gameCanvas.width = this.gameWidth;
    this.gameCanvas.height = this.gameHeight;
    this.gameCtx = this.gameCanvas.getContext("2d");
    this.gameCtx.drawImage(this.srcImage, 0, 0, this.gameWidth, this.gameHeight);

    this.gameCanvas.classList.add("gameCanvas");
    this.gameCanvas.style.zIndex = 500;
    //    this.container.appendChild(this.gameCanvas)

    /* scale pieces */
    this.scalex = this.gameWidth / this.nx;    // average width of pieces
    this.scaley = this.gameHeight / this.ny;   // average height of pieces

    this.pieces.forEach(row => {
      row.forEach(piece => piece.scale(this));
    }); // this.pieces.forEach

    /* calculate offset for centering image in container */
    this.offsx = (this.contWidth - this.gameWidth) / 2;
    this.offsy = (this.contHeight - this.gameHeight) / 2;

    /* computes the distance below which two pieces connect
      depends on the actual size of pieces, with lower limit */
    this.dConnect = Math.max(10, Math.min(this.scalex, this.scaley) / 10);

    /* computes the thickness used for emboss effect */
    // from 2 (scalex = 0)  to 5 (scalex = 200), not more than 5
    this.embossThickness = Math.min(2 + this.scalex / 200 * (5 - 2), 5);

  } // Puzzle.scale

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  relativeMouseCoordinates(event) {

    /* takes mouse coordinates from mouse event
      returns coordinates relative to container, even if page is scrolled or zoommed */

    const br = this.container.getBoundingClientRect();
    return {
      x: event.clientX - br.x,
      y: event.clientY - br.y
    };
  } // Puzzle.relativeMouseCoordinates

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  limitRectangle(rect) {
    /* limits the possible position for the coordinates of a piece, to prevent it from beeing out of the
    container */

    rect.x0 = Math.min(Math.max(rect.x0, -this.scalex / 2), this.contWidth - 1.5 * this.scalex);
    rect.x1 = Math.min(Math.max(rect.x1, -this.scalex / 2), this.contWidth - 1.5 * this.scalex);
    rect.y0 = Math.min(Math.max(rect.y0, -this.scaley / 2), this.contHeight - 1.5 * this.scaley);
    rect.y1 = Math.min(Math.max(rect.y1, -this.scaley / 2), this.contHeight - 1.5 * this.scaley);

    
  }
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  spreadInRectangle(rect) {
    this.limitRectangle(rect);
    this.polyPieces.forEach(pp =>
      pp.moveTo(randomNumber(rect.x0, rect.x1), randomNumber(rect.y0, rect.y1))
    );
  } // spreadInRectangle
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  spreadSetInRectangle(set, rect) {
    this.limitRectangle(rect);
    set.forEach(pp =>
      pp.moveTo(randomNumber(rect.x0, rect.x1), randomNumber(rect.y0, rect.y1))
    );
  } // spreadInRectangle
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  optimInitial() {
    /* based on :
    - container dimensions
    - picture dimensions
    - piece dimensions

    moves the pieces at the beginning of the game along one to four sides of the container

    */
    // extreme values for 1 piece polypieces
    const minx = -this.scalex / 2;
    const miny = -this.scaley / 2;
    const maxx = this.contWidth - 1.5 * this.scalex;
    const maxy = this.contHeight - 1.5 * this.scaley;
    // how much space left around image ?
    let freex = this.contWidth - this.gameWidth;
    let freey = this.contHeight - this.gameHeight;

    let where = [0, 0, 0, 0]; // to record on which sides pieces will be moved
    let rects = [];
    // first evaluation
    if (freex > 1.5 * this.scalex) {
      where[1] = 1; // right
      rects[1] = {
        x0: this.gameWidth - 0.5 * this.scalex,
        x1: maxx,
        y0: miny, y1: maxy
      };
    }
    if (freex > 3 * this.scalex) {
      where[3] = 1; // left
      rects[3] = {
        x0: minx,
        x1: freex / 2 - 1.5 * this.scalex,
        y0: miny, y1: maxy
      };
      rects[1].x0 = this.contWidth - freex / 2 - 0.5 * this.scalex;
    }
    if (freey > 1.5 * this.scaley) {
      where[2] = 1; // bottom
      rects[2] = {
        x0: minx, x1: maxx,
        y0: this.gameHeight - 0.5 * this.scaley,
        y1: this.contHeight - 1.5 * this.scaley
      };
    }
    if (freey > 3 * this.scaley) {
      where[0] = 1; // top
      rects[0] = {
        x0: minx, x1: maxx,
        y0: miny,
        y1: freey / 2 - 1.5 * this.scaley
      };
      rects[2].y0 = this.contHeight - freey / 2 - 0.5 * this.scaley;
    }
    if (where.reduce((sum, a) => sum + a) < 2) {
      // if no place defined yet, or only one place
      if (freex - freey > 0.2 * this.scalex || where[1]) {
        // significantly more place horizontally : to right
        this.spreadInRectangle({
          x0: this.gameWidth - this.scalex / 2,
          x1: maxx,
          y0: miny,
          y1: maxy
        });
      } else if (freey - freex > 0.2 * this.scalex || where[2]) {
        // significantly more place vertically : to bottom
        this.spreadInRectangle({
          x0: minx,
          x1: maxx,
          y0: this.gameHeight - this.scaley / 2,
          y1: maxy
        });
      } else {
        if (this.gameWidth > this.gameHeight) {
          // more wide than high : to bottom
          this.spreadInRectangle({
            x0: minx,
            x1: maxx,
            y0: this.gameHeight - this.scaley / 2,
            y1: maxy
          });

        } else { // to right
          this.spreadInRectangle({
            x0: this.gameWidth - this.scalex / 2,
            x1: maxx,
            y0: miny,
            y1: maxy
          });
        }
      }
      return;
    }
    /* more than one area to put the pieces
    */
    let nrects = [];
    rects.forEach(rect => {
      nrects.push(rect);
    });
    let k0 = 0
    const npTot = this.nx * this.ny;
    for (let k = 0; k < nrects.length; ++k) {
      let k1 = Math.round((k + 1) / nrects.length * npTot);
      this.spreadSetInRectangle(this.polyPieces.slice(k0, k1), nrects[k]);
      k0 = k1;
    }
    arrShuffle(this.polyPieces);
    this.evaluateZIndex();

  } // optimInitial

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  evaluateZIndex() {

    /* re-evaluates order of polypieces in puzzle after a merge
      the polypieces must be in decreasing order of size(number of pieces),
      preserving the previous order as much as possible
    */
    for (let k = this.polyPieces.length - 1; k > 0; --k) {
      if (this.polyPieces[k].pieces.length > this.polyPieces[k - 1].pieces.length) {
        // swap pieces if not in right order
        [this.polyPieces[k], this.polyPieces[k - 1]] = [this.polyPieces[k - 1], this.polyPieces[k]];
      }
    }
    // re-assign zIndex
    this.polyPieces.forEach((pp, k) => {
      pp.canvas.style.zIndex = k + 10;
    });
    this.zIndexSup = this.polyPieces.length + 10; // higher than 'normal' zIndices
  } // Puzzle.evaluateZIndex
}