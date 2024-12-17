function randomNumber(min, max) {
  if (typeof max == 'undefined') return min * Math.random();
  return min + (max - min) * Math.random();
}

function randomInteger(min, max) {
  if (typeof max == 'undefined') {
    max = min; min = 0;
  }
  return Math.floor(min + (max - min) * Math.random());
}

// shuffling array elements.
function arrShuffle(array) {
  let k1, temp;
  for (let k = array.length - 1; k >= 1; --k) {
    k1 = randomInteger(0, k + 1);
    temp = array[k];
    array[k] = array[k1];
    array[k1] = temp;
  }
  return array
}

// loading image to a puzzle.
function imageLoaded(puzzle, events, event = 'srcImageLoaded') {
  events.push({ event: event });
  puzzle.imageLoaded = true;
}

// image width <= puzzle container width
// image height <= puzzle container height
// at center of the puzzle container.
function fitImage(img, width, height) {
  let wn = img.naturalWidth;
  let hn = img.naturalHeight;
  let w = width;
  let h = w * hn / wn;
  if (h > height) {
    h = height;
    w = h * wn / hn;
  }
  img.style.position = "absolute";
  img.style.width = w + "px";
  img.style.height = h + "px";
  img.style.top = "50%";
  img.style.left = "50%";
  img.style.transform = "translate(-50%,-50%)";
}

