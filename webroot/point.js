class Point {
  constructor(x, y) {
    this.x = Number(x);
    this.y = Number(y);
  }
  copy() {
    return new Point(this.x, this.y);
  }

  distance(otherPoint) {
    return Math.hypot(this.x - otherPoint.x, this.y - otherPoint.y);
  }
}