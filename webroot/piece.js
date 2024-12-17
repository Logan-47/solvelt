class Piece {
  constructor(kx, ky) { // object with 4 sides
    this.ts = new Side(); // top side
    this.rs = new Side(); // right side
    this.bs = new Side(); // bottom side
    this.ls = new Side(); // left side
    this.kx = kx;
    this.ky = ky;
  }

  scale(puzzle) {
    this.ts.scale(puzzle);
    this.rs.scale(puzzle);
    this.bs.scale(puzzle);
    this.ls.scale(puzzle);
  }
}