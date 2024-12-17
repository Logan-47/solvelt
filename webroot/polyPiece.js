class PolyPiece {

  // represents a group of pieces well positionned with respect  to each other.
  // pckxmin, pckxmax, pckymin and pckymax record the lowest and highest kx and ky
  // creates a canvas to draw polypiece on, and appends this canvas to puzzle.container
  constructor(initialPiece, puzzle) {
    this.pckxmin = initialPiece.kx;
    this.pckxmax = initialPiece.kx + 1;
    this.pckymin = initialPiece.ky;
    this.pckymax = initialPiece.ky + 1;
    this.pieces = [initialPiece];
    this.puzzle = puzzle;
    this.listLoops();

    this.canvas = document.createElement('CANVAS');
    // size and z-index will be defined later
    puzzle.container.appendChild(this.canvas);
    this.canvas.classList.add('polypiece');
    this.ctx = this.canvas.getContext("2d");
  }

  /*
    this method
      - adds pieces of otherPoly to this PolyPiece
      - reorders the pieces inside the polypiece
      - adjusts coordinates of new pieces to make them consistent with this polyPiece
      - re-evaluates the z - index of the polyPieces
  */

  merge(otherPoly) {

    const orgpckxmin = this.pckxmin;
    const orgpckymin = this.pckymin;

    // remove otherPoly from list of polypieces
    const kOther = this.puzzle.polyPieces.indexOf(otherPoly);
    this.puzzle.polyPieces.splice(kOther, 1);

    // remove other canvas from container
    this.puzzle.container.removeChild(otherPoly.canvas);

    for (let k = 0; k < otherPoly.pieces.length; ++k) {
      this.pieces.push(otherPoly.pieces[k]);
      // watch leftmost, topmost... pieces
      if (otherPoly.pieces[k].kx < this.pckxmin) this.pckxmin = otherPoly.pieces[k].kx;
      if (otherPoly.pieces[k].kx + 1 > this.pckxmax) this.pckxmax = otherPoly.pieces[k].kx + 1;
      if (otherPoly.pieces[k].ky < this.pckymin) this.pckymin = otherPoly.pieces[k].ky;
      if (otherPoly.pieces[k].ky + 1 > this.pckymax) this.pckymax = otherPoly.pieces[k].ky + 1;
    } // for k

    // sort the pieces by increasing kx, ky

    this.pieces.sort(function (p1, p2) {
      if (p1.ky < p2.ky) return -1;
      if (p1.ky > p2.ky) return 1;
      if (p1.kx < p2.kx) return -1;
      if (p1.kx > p2.kx) return 1;
      return 0; // should not occur
    });

    // redefine consecutive edges
    this.listLoops();

    this.drawImage();
    this.moveTo(this.x + this.puzzle.scalex * (this.pckxmin - orgpckxmin),
      this.y + this.puzzle.scaley * (this.pckymin - orgpckymin));

    this.puzzle.evaluateZIndex();
  } // merge

  ifNear(otherPoly) {

    let p1, p2;
    let puzzle = this.puzzle;

    // coordinates of origin of full picture for this PolyPieces
    let x = this.x - puzzle.scalex * this.pckxmin;
    let y = this.y - puzzle.scaley * this.pckymin;

    let ppx = otherPoly.x - puzzle.scalex * otherPoly.pckxmin;
    let ppy = otherPoly.y - puzzle.scaley * otherPoly.pckymin;
    if (Math.hypot(x - ppx, y - ppy) >= puzzle.dConnect) return false; // not close enough

    // this and otherPoly are in good relative position, have they a common side ?
    for (let k = this.pieces.length - 1; k >= 0; --k) {
      p1 = this.pieces[k];
      for (let ko = otherPoly.pieces.length - 1; ko >= 0; --ko) {
        p2 = otherPoly.pieces[ko];
        if (p1.kx == p2.kx && Math.abs(p1.ky - p2.ky) == 1) return true; // true neighbors found
        if (p1.ky == p2.ky && Math.abs(p1.kx - p2.kx) == 1) return true; // true neighbors found
      } // for k
    } // for k

    // nothing matches

    return false;

  } 

  /* algorithm to determine the boundary of a PolyPiece
    input : a table of cells, hopefully defining a 'good' PolyPiece, i.e. all connected together
    every cell is given as an object {kx: indice, ky: indice} representing an element of a 2D array.

    returned value : table of Loops, because the boundary may be made of several
  simple loops : there may be a 'hole' in a PolyPiece
  every loop is a list of consecutive edges,
  every edge if an object {kp: index, edge: b} where kp is the index of the cell ine
  the input array, and edge the side (0(top), 1(right), 2(bottom), 3(left))
  every edge contains kx and ky too, normally not used here

  This method does not depend on the fact that pieces have been scaled or not.
  */

  listLoops() {

    // internal : checks if an edge given by kx, ky is common with another cell
    // returns true or false
    const that = this;
    function edgeIsCommon(kx, ky, edge) {
      let k;
      switch (edge) {
        case 0: ky--; break; // top edge
        case 1: kx++; break; // right edge
        case 2: ky++; break; // bottom edge
        case 3: kx--; break; // left edge
      } // switch
      for (k = 0; k < that.pieces.length; k++) {
        if (kx == that.pieces[k].kx && ky == that.pieces[k].ky) return true; // we found the neighbor
      }
      return false; // not a common edge
    } // function edgeIsCommon

    // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
    // internal : checks if an edge given by kx, ky is in tbEdges
    // return index in tbEdges, or false

    function edgeIsInTbEdges(kx, ky, edge) {
      let k;
      for (k = 0; k < tbEdges.length; k++) {
        if (kx == tbEdges[k].kx && ky == tbEdges[k].ky && edge == tbEdges[k].edge) return k; // found it
      }
      return false; // not found
    } // function edgeIsInTbEdges

    // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -

    let tbLoops = []; // for the result
    let tbEdges = []; // set of edges which are not shared by 2 pieces of input
    let k;
    let kEdge; // to count 4 edges
    let lp; // for loop during its creation
    let currEdge; // current edge
    let tries; // tries counter
    let edgeNumber; // number of edge found during research
    let potNext;

    // table of tries

    let tbTries = [
      // if we are on edge 0 (top)
      [
        { dkx: 0, dky: 0, edge: 1 }, // try # 0
        { dkx: 1, dky: 0, edge: 0 }, // try # 1
        { dkx: 1, dky: -1, edge: 3 } // try # 2
      ],
      // if we are on edge 1 (right)
      [
        { dkx: 0, dky: 0, edge: 2 },
        { dkx: 0, dky: 1, edge: 1 },
        { dkx: 1, dky: 1, edge: 0 }
      ],
      // if we are on edge 2 (bottom)
      [
        { dkx: 0, dky: 0, edge: 3 },
        { dkx: - 1, dky: 0, edge: 2 },
        { dkx: - 1, dky: 1, edge: 1 }
      ],
      // if we are on edge 3 (left)
      [
        { dkx: 0, dky: 0, edge: 0 },
        { dkx: 0, dky: - 1, edge: 3 },
        { dkx: - 1, dky: - 1, edge: 2 }
      ],
    ];

    // create list of not shared edges (=> belong to boundary)
    for (k = 0; k < this.pieces.length; k++) {
      for (kEdge = 0; kEdge < 4; kEdge++) {
        if (!edgeIsCommon(this.pieces[k].kx, this.pieces[k].ky, kEdge))
          tbEdges.push({ kx: this.pieces[k].kx, ky: this.pieces[k].ky, edge: kEdge, kp: k })
      } // for kEdge
    } // for k

    while (tbEdges.length > 0) {
      lp = []; // new loop
      currEdge = tbEdges[0];   // we begin with first available edge
      lp.push(currEdge);       // add it to loop
      tbEdges.splice(0, 1);    // remove from list of available sides
      do {
        for (tries = 0; tries < 3; tries++) {
          potNext = tbTries[currEdge.edge][tries];
          edgeNumber = edgeIsInTbEdges(currEdge.kx + potNext.dkx, currEdge.ky + potNext.dky, potNext.edge);
          if (edgeNumber === false) continue; // can't here
          // new element in loop
          currEdge = tbEdges[edgeNumber];     // new current edge
          lp.push(currEdge);              // add it to loop
          tbEdges.splice(edgeNumber, 1);  // remove from list of available sides
          break; // stop tries !
        } // for tries
        if (edgeNumber === false) break; // loop is closed
      } while (1); // do-while exited by break
      tbLoops.push(lp); // add this loop to loops list
    } // while tbEdges...

    // replace components of loops by actual pieces sides
    this.tbLoops = tbLoops.map(loop => loop.map(edge => {
      let cell = this.pieces[edge.kp];
      if (edge.edge == 0) return cell.ts;
      if (edge.edge == 1) return cell.rs;
      if (edge.edge == 2) return cell.bs;
      return cell.ls;
    }));
  } // polyPiece.listLoops

  // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -

  drawPath(ctx, shiftx, shifty) {

    //    ctx.beginPath(); No, not for Path2D

    this.tbLoops.forEach(loop => {
      let without = false;
      loop.forEach(side => {
        side.drawPath(ctx, shiftx, shifty, without);
        without = true;
      });
      ctx.closePath();
    });

  } // PolyPiece.drawPath

  // -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -   -

  drawImage() {
    /* resizes canvas to be bigger than if pieces were perfect rectangles
    so that their shapes actually fit in the canvas
    copies the relevant part of gamePicture clipped by path
    adds shadow and emboss
    */
    //       if (this.pieces[0].kx!=1 ||this.pieces[0].ky!= 1) return;
    const puzzle = this.puzzle;
    this.nx = this.pckxmax - this.pckxmin + 1;
    this.ny = this.pckymax - this.pckymin + 1;
    this.canvas.width = this.nx * puzzle.scalex;
    this.canvas.height = this.ny * puzzle.scaley;

    // difference between position in this canvas and position in gameImage

    this.offsx = (this.pckxmin - 0.5) * puzzle.scalex;
    this.offsy = (this.pckymin - 0.5) * puzzle.scaley;

    this.path = new Path2D();
    this.drawPath(this.path, -this.offsx, -this.offsy);

    // make shadow
    this.ctx.fillStyle = 'none';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 4;
    this.ctx.shadowOffsetY = 4;
    this.ctx.fill(this.path);
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0)'; // stop shadow effect

    this.pieces.forEach((pp, kk) => {

      this.ctx.save();

      const path = new Path2D();
      const shiftx = -this.offsx;
      const shifty = -this.offsy;
      pp.ts.drawPath(path, shiftx, shifty, false);
      pp.rs.drawPath(path, shiftx, shifty, true);
      pp.bs.drawPath(path, shiftx, shifty, true);
      pp.ls.drawPath(path, shiftx, shifty, true);
      path.closePath();

      this.ctx.clip(path);
      // do not copy from negative coordinates, does not work for all browsers
      const srcx = pp.kx ? ((pp.kx - 0.5) * puzzle.scalex) : 0;
      const srcy = pp.ky ? ((pp.ky - 0.5) * puzzle.scaley) : 0;

      const destx = (pp.kx ? 0 : puzzle.scalex / 2) + (pp.kx - this.pckxmin) * puzzle.scalex;
      const desty = (pp.ky ? 0 : puzzle.scaley / 2) + (pp.ky - this.pckymin) * puzzle.scaley;

      let w = 2 * puzzle.scalex;
      let h = 2 * puzzle.scaley;
      if (srcx + w > puzzle.gameCanvas.width) w = puzzle.gameCanvas.width - srcx;
      if (srcy + h > puzzle.gameCanvas.height) h = puzzle.gameCanvas.height - srcy;

      this.ctx.drawImage(puzzle.gameCanvas, srcx, srcy, w, h,
        destx, desty, w, h);

      this.ctx.translate(puzzle.embossThickness / 2, -puzzle.embossThickness / 2);
      this.ctx.lineWidth = puzzle.embossThickness;
      this.ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      this.ctx.stroke(path);

      this.ctx.translate(-puzzle.embossThickness, puzzle.embossThickness);
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      this.ctx.stroke(path);
      this.ctx.restore();
    });

  } // PolyPiece.drawImage

  moveTo(x, y) {
    // sets the left, top properties (relative to container) of this.canvas
    this.x = x;
    this.y = y;
    this.canvas.style.left = x + 'px';
    this.canvas.style.top = y + 'px';
  } //

  moveToInitialPlace() {
    const puzzle = this.puzzle;
    this.moveTo(puzzle.offsx + (this.pckxmin - 0.5) * puzzle.scalex,
      puzzle.offsy + (this.pckymin - 0.5) * puzzle.scaley);
  }

}