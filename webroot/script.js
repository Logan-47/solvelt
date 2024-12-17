function createFileInput(){
  let fileInput = document.createElement('input');
  fileInput.setAttribute('type', 'file');
  fileInput.style.display = 'none';
  return fileInput;
}


class App {
  constructor() {
    let events = []; // Event Queue
    let state = 0;
    let moving; // moved Pieces
    let tmpImage;
    
    window.addEventListener("resize", event => {
      // do not accumulate resize events in events queue - keep only current one
      if (events.length && events[events.length - 1].event == "resize") return;;
      events.push({ event: "resize" });
    });

    // Initialize New Puzzle.
    const puzzle = new Puzzle({ container: "forPuzzle", events });


    // Inital Image loading.
    function loadInitialFile(puzzle){
      puzzle.srcImage.src = "https://styles.redditmedia.com/t5_a5im34/styles/communityIcon_ez1m38zhef4e1.png";
    }


    loadInitialFile(puzzle);
    

    // Handler for image inputs
    function getFileHandler() {
      if (this.files.length == 0) {
        return;
      }
    
      let file = this.files[0];
      let reader = new FileReader();
    
      reader.addEventListener('load', () => {
        puzzle.srcImage.src = reader.result;
      });
      reader.readAsDataURL(file);
      window.parent?.postMessage(
        {
          type: 'action',
          data: { reset: true },
        },
        '*'
      );
    }
    
    // Custom User input file
    function loadFile() {
      const fileInput = createFileInput();
      fileInput.addEventListener("change", getFileHandler);
      fileInput.setAttribute("accept", "image/*");
      fileInput.value = null;
      fileInput.click();
    }


    // Burger Menu
    let menu = (function () {
      let menu = { items: [] };
      document.querySelectorAll("#menu li").forEach(menuEl => {
        let len = menu.items.length;
        let item = { element: menuEl, len: len };
        menu.items[len] = item;
    
      });
    
      menu.open = function () {
        menu.items.forEach(item => item.element.style.display = "block");
        menu.opened = true;
      }

      menu.close = function () {
        menu.items.forEach((item, k) => {
          if (k > 0) item.element.style.display = "none"; // never hide element 0
        });
        menu.opened = false;
      }
      menu.items[0].element.addEventListener("click", () => {
        if (menu.opened) menu.close(); else menu.open()
      });
      menu.items[1].element.addEventListener("click", loadFile);
  
      return menu;
    })();

    menu.close();

    // Animations
    let animate = function () {
      requestAnimationFrame(animate);

      let event;
      if (events.length) event = events.shift(); // read event from queue , from the start.
      if (event && event.event == "reset") state = 0;
      if (event && event.event == "srcImageLoaded") state = 0;
      // resize event
      if (event && event.event == "resize") {

        // storing dimensions of container.
        puzzle.prevWidth = puzzle.contWidth;
        puzzle.prevHeight = puzzle.contHeight;

        puzzle.getContainerSize();
        if (state == 15 || state > 60) { // resize initial or final picture
          puzzle.getContainerSize();
          fitImage(tmpImage, puzzle.contWidth * 0.70, puzzle.contHeight * 0.70);
        }
        else if (state >= 25) { // resize pieces
          puzzle.prevGameWidth = puzzle.gameWidth;
          puzzle.prevGameHeight = puzzle.gameHeight;
          puzzle.scale();
          let reScale = puzzle.contWidth / puzzle.prevWidth;
          puzzle.polyPieces.forEach(pp => {
            // compute new position : game centered homothety
            let nx = puzzle.contWidth / 2 - (puzzle.prevWidth / 2 - pp.x) * reScale;
            let ny = puzzle.contHeight / 2 - (puzzle.prevHeight / 2 - pp.y) * reScale;
            // enforce pieces to stay in game area
            nx = Math.min(Math.max(nx, -puzzle.scalex / 2), puzzle.contWidth - 1.5 * puzzle.scalex);
            ny = Math.min(Math.max(ny, -puzzle.scaley / 2), puzzle.contHeight - 1.5 * puzzle.scaley);

            pp.moveTo(nx, ny);
            pp.drawImage();

          }); 
        }

        return;
      }
      switch (state) {
        /* initialisation */
        case 0:
          state = 10;
          break;
        case 10:
          // Adding image to puzzle container.
          if (!puzzle.imageLoaded) return;
          puzzle.container.innerHTML = "";
          tmpImage = document.createElement("img");
          tmpImage.src = puzzle.srcImage.src;
          puzzle.getContainerSize(); // setting current dimension of the container.
          fitImage(tmpImage, puzzle.contWidth * 0.70, puzzle.contHeight * 0.70);
          tmpImage.style.boxShadow = "4px 4px 4px rgba(0, 0, 0, 0.5)";
          puzzle.container.appendChild(tmpImage);
          state = 15;
          break;

        // number of pieces.
        case 15:
          event = { event: "nbpieces", nbpieces: 12 };
          if (!event) return;
          if (event.event == "nbpieces") {
            puzzle.nbPieces = event.nbpieces;
            state = 20;
          } else if (event.event == "srcImageLoaded") { // if user loaded image
            // insert the user input image into the puzzle container.
            state = 10;
            return;
          } else return;

        case 20:
          // menu.close();
          puzzle.create(); // create shape of pieces, independant of size
          puzzle.scale();
          puzzle.polyPieces.forEach(pp => {
            pp.drawImage();
            pp.moveToInitialPlace();
          }); // puzzle.polypieces.forEach
          puzzle.gameCanvas.style.top = puzzle.offsy + "px";
          puzzle.gameCanvas.style.left = puzzle.offsx + "px";
          puzzle.gameCanvas.style.display = "block";
          state = 25;
          break;

        case 25: // spread pieces
          puzzle.gameCanvas.style.display = "none"; // hide reference image
          puzzle.polyPieces.forEach(pp => {
            pp.canvas.classList.add("moving");
          });
          state = 30;
          break;

        case 30: // launch movement
          puzzle.optimInitial(); // initial "optimal" spread position

          /* this time out must be a bit longer than the css .moving transition-duration */
          setTimeout(() => events.push({ event: "finished" }), 1200);
          state = 35;
          break;

        case 35: // wait for end of movement
          if (!event || event.event != "finished") return;
          puzzle.polyPieces.forEach(pp => {
            pp.canvas.classList.remove("moving");
          });

          state = 50;

          break;

        /* wait for user grabbing a piece or other action */
        case 50:
          if (!event) return;
          if (event.event == "nbpieces") {
            puzzle.nbPieces = event.nbpieces;
            state = 20;
            return;
          }
          if (event.event != "touch") return;
          moving = {
            xMouseInit: event.position.x,
            yMouseInit: event.position.y
          }


          /* evaluates if contact inside a PolyPiece, by decreasing z-index */
          for (let k = puzzle.polyPieces.length - 1; k >= 0; --k) {
            let pp = puzzle.polyPieces[k];
            if (pp.ctx.isPointInPath(pp.path, event.position.x - pp.x, event.position.y - pp.y)) {
              moving.pp = pp;
              moving.ppXInit = pp.x;
              moving.ppYInit = pp.y;
              // move selected piece to top of polypieces stack
              puzzle.polyPieces.splice(k, 1);
              puzzle.polyPieces.push(pp);
              pp.canvas.style.zIndex = puzzle.zIndexSup; // to foreground
              state = 55;
              return;
            }

          } // for k
          break;

        case 55:  // moving piece
          if (!event) return;
          switch (event.event) {
            case "move":
              moving.pp.moveTo(event.position.x - moving.xMouseInit + moving.ppXInit,
                event.position.y - moving.yMouseInit + moving.ppYInit);
              break;
            case "leave":
              // check if moved polypiece is close to a matching other polypiece
              // check repeatedly since polypieces moved by merging may come close to other polypieces
              let doneSomething;
              do {
                doneSomething = false;
                for (let k = puzzle.polyPieces.length - 1; k >= 0; --k) {
                  let pp = puzzle.polyPieces[k];
                  if (pp == moving.pp) continue; // don't match with myself
                  if (moving.pp.ifNear(pp)) { // a match !
                    // compare polypieces sizes to move smallest one
                    if (pp.pieces.length > moving.pp.pieces.length) {
                      pp.merge(moving.pp);
                      moving.pp = pp; // memorize piece to follow
                    } else {
                      moving.pp.merge(pp);
                    }
                    doneSomething = true;
                    break;
                  }
                } // for k

              } while (doneSomething);
              // not at its right place
              puzzle.evaluateZIndex();
              state = 50;
              if (puzzle.polyPieces.length == 1) {
                state = 60;
                window.parent?.postMessage(
                  {
                    type: 'action',
                    data: { gameWon: true },
                  },
                  '*'
                );
              }
              return;
          } // switch (event.event)

          break;

        case 60: // winning
          puzzle.container.innerHTML = "";
          puzzle.getContainerSize();
          fitImage(tmpImage, puzzle.contWidth * 0.70, puzzle.contHeight * 0.70);
          tmpImage.style.boxShadow = "4px 4px 4px rgba(0, 0, 0, 0.5)";
          tmpImage.style.left = (puzzle.polyPieces[0].x + puzzle.scalex / 2 + puzzle.gameWidth / 2) / puzzle.contWidth * 100 + "%";
          tmpImage.style.top = (puzzle.polyPieces[0].y + puzzle.scaley / 2 + puzzle.gameHeight / 2) / puzzle.contHeight * 100 + "%";

          tmpImage.classList.add("moving");
          setTimeout(() => tmpImage.style.top = tmpImage.style.left = "50%", 0);
          puzzle.container.appendChild(tmpImage);
          state = 65;
          // menu.open();

        case 65: // wait for new number of pieces - of new picture
          if (event && event.event == "nbpieces") {
            puzzle.nbPieces = event.nbpieces;
            state = 20;
            return;
          }
          break;

        case 9999: break;
        default:
          let st = state;
          state = 9999;  // to display message beyond only once
          throw ("oops, unknown state " + st);
      } // switch(state)
    }
    requestAnimationFrame(animate);
  }
}

new App();
