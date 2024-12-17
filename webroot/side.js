class Side {
  constructor() {
    this.type = ""; // "d" pour straight line or "z" pour classic
    this.points = []; // real points or Bezier curve points
    // this.scaledPoints will be added when we know the scale
  } // Side

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  reversed() {
    // returns a new Side, copy of current one but reversed
    const ns = new Side();
    ns.type = this.type;
    ns.points = this.points.slice().reverse();
    return ns;
  } // Side.reversed

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  scale(puzzle) {
    /* uses actual dimensions of puzzle to compute actual side points
    these points are not shifted by the piece position : the top left corner is at (0,0)
    */
    const coefx = puzzle.scalex;
    const coefy = puzzle.scaley;
    this.scaledPoints = this.points.map(p => new Point(p.x * coefx, p.y * coefy));

  } //

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /*
  draws the path corresponding to a side
  Parameters :
    ctx : canvas context
    shiftx, shifty : position shift (used to create emboss effect)
    withoutMoveTo : to decide whether to do a moveTo to the first point. Without MoveTo
    must be done only for the first side of a piece, not for the following ones
  */

  drawPath(ctx, shiftx, shifty, withoutMoveTo) {

    if (!withoutMoveTo) {
      ctx.moveTo(this.scaledPoints[0].x + shiftx, this.scaledPoints[0].y + shifty);
    }
    if (this.type == "d") {
      ctx.lineTo(this.scaledPoints[1].x + shiftx, this.scaledPoints[1].y + shifty);
    } else { // edge zigzag
      for (let k = 1; k < this.scaledPoints.length - 1; k += 3) {
        ctx.bezierCurveTo(this.scaledPoints[k].x + shiftx, this.scaledPoints[k].y + shifty,
          this.scaledPoints[k + 1].x + shiftx, this.scaledPoints[k + 1].y + shifty,
          this.scaledPoints[k + 2].x + shiftx, this.scaledPoints[k + 2].y + shifty);
      } // for k
    } // if jigsaw side

  } // Side.drawPath
} 