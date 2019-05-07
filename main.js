/**
 * This p5.js sketch creates a maze and renders it in 3D using a form of 
 * "raycasting" similar to the method used in Wolfenstein 3D by id Software. It 
 * can also display the maze from a top-down 2D map-perspective. I was inspired
 * to write this after watching https://www.youtube.com/watch?v=eOCQfxRQ2pY
 * and while working on my own basic ray tracing renderer.
 * 
 * Originally written in December 2018 by Ben (quillaja).
 * Live demo at: http://quillaja.net/raymaze/sketch.html
 * Github: https://github.com/quillaja/raymaze
 */

/**
 * The camera, which is the player's point of view.
 * @type {Camera}
 */
let cam;
/**
 * List of direction rays to sample.
 * @type {p5.Vector[]}
 */
let dirs;

/**
 * The maze information.
 * @type {Grid}
 */
let grid;

/**
 * Image used as the maze background.
 * @type {p5.Graphics}
 */
let bg;

/**
 * Mechanism to display messages on the screen for a period of time.
 * @type {MessageQueue}
 */
let msgs;

// horizontal and vertical size of the maze.
// used in calcuateRenderParams()
const gridw = 15;
const gridh = 15;

// set in calculateRenderParams()
let scalef = 1; // scales map view
let raywidth = 0; // alters number of rays used/"resolution" of walls. 

// A list of options that can be turned on and off (generally by the player).
const toggles = {
    mapView: false,
    hideMaze: true,
    showRays: false,
    viewChanged: true,
    statsDisplay: false,
    raysMethod: "lerp",
}

// object for storing program statistics.
const stats = {
    fpsSum: 0,
    fpsCount: 0,
    msPerRay: 0,
    msPerRaySum: 0,
    msPerRayCount: 0,
    tilesCheckedPerRay: 0,
    tilesCheckedPerRaySum: 0,
    tilesCheckedPerRayCount: 0,
}

/**
 * Set up the sketch.
 */
function setup() {
    createCanvas(windowWidth, windowHeight - 5);

    calculateRenderingParams();
    createGridAndPlaceCam();
    msgs = new MessageQueue();
    msgs.add(8, "press s to toggle statistics");
    msgs.add(8, "press space to toggle 3D or map view");
    msgs.add(8, "press arrow keys to move");
    msgs.add(8, "find the green exit");
}

/**
 * Render the sketch.
 */
function draw() {

    // move player
    if (keyIsDown(LEFT_ARROW) || (mouseIsPressed && mouseX < width / 3)) {
        cam.rotateCW();
    }
    if (keyIsDown(RIGHT_ARROW) || (mouseIsPressed && mouseX >= 2 / 3 * width)) {
        cam.rotateCCW();
    }
    if (keyIsDown(UP_ARROW) || (mouseIsPressed && mouseY < height / 3)) {
        cam.moveForward();
    }
    if (keyIsDown(DOWN_ARROW) || (mouseIsPressed && mouseY >= 2 / 3 * height)) {
        cam.moveBackward();
    }

    // check and correct player intersection with walls
    cam.checkCollisions(grid);

    // draw view
    // only draw if necessary to help maintain good framerate
    if (cam.hasMoved() || toggles.viewChanged) {
        background(0);
        toggles.viewChanged = false;
        stats.tilesCheckedPerRay = 0;

        grid.unhideCell(cam.pos.x, cam.pos.y);

        // Draw either the map view or 3d "raycast" view
        // based on the player-controlled toggle.
        if (toggles.mapView) {
            // 2d map view
            push();
            scale(scalef, scalef);

            noStroke();
            for (let y = 0; y < grid.height; y++) {
                for (let x = 0; x < grid.width; x++) {
                    if (grid.match(x, y, SOLID) ||
                        (toggles.hideMaze && grid.match(x, y, HIDDEN))) {
                        let c = vecToColor(colorFromCell(grid.cell(x, y)));
                        fill(c);
                        rect(x, y, 1, 1);
                    }
                }
            }

            strokeWeight(0.01);
            noFill();

            // either draw the actual rays traced or a simple directional indicator.
            if (toggles.showRays) {
                let hit = new Hit();
                for (const dir of cam.getRays(dirs)) {
                    stroke(0, 0, 255);
                    line(cam.pos.x, cam.pos.y, cam.pos.x + dir.x, cam.pos.y + dir.y);
                    marchRay(hit, cam.pos, dir, grid)
                    stroke(0, 255, 0);
                    ellipse(hit.pos.x, hit.pos.y, 0.1);
                }
            } else {
                fill(0, 0, 255);
                ellipse(cam.pos.x, cam.pos.y, 0.4);
                stroke(0, 255, 0);
                strokeWeight(0.08);
                line(cam.pos.x, cam.pos.y, cam.pos.x + 0.5 * Math.cos(cam.rot), cam.pos.y + 0.5 * Math.sin(cam.rot));
            }
            pop();
        } else {
            // 3d view
            push();

            // draw ceiling and floor
            image(bg, 0, 0);

            // draw walls
            rectMode(CENTER);
            translate(0, height / 2);
            cam.getRays(dirs); // get a list of directional rays to cast
            const lookx = Math.cos(cam.rot); // calculate look direction vector
            const looky = Math.sin(cam.rot);
            let hit = new Hit(); // create only one Hit obj and reuse to reduce garbage generation.
            for (let i = 0; i < dirs.length; i++) {
                let dir = dirs[i];
                marchRay(hit, cam.pos, dir, grid); // do the "raycast"
                // dot product ray dir with look dir to scale d so straight lines look straight.
                let d = hit.d * (dir.x * lookx + dir.y * looky);
                let c = vecToColor(colorFromCell(hit.cell).div(Math.max(1, d)));
                fill(c);
                stroke(c);
                rect((i + 0.5) * raywidth, 0, raywidth, height / d);
            }
            pop();
        }

        // update and show statistics
        stats.msPerRay /= dirs.length;
        stats.tilesCheckedPerRay /= dirs.length;
        stats.fpsSum += frameRate();
        stats.fpsCount++;
        stats.tilesCheckedPerRaySum += stats.tilesCheckedPerRay;
        stats.tilesCheckedPerRayCount++;
        stats.msPerRaySum += stats.msPerRay;
        stats.msPerRayCount++;

        if (toggles.statsDisplay) {
            textFont("monospace");
            fill(255);
            textSize(15);
            text("Statistics", 10, row(0));
            text(`AvgFps:     ${(stats.fpsSum / stats.fpsCount).toFixed(0)}`, 10, row(1));
            let g = getCellCoords(cam.pos);
            text(`Cell:       ${g.x.toFixed(0)}, ${g.y.toFixed(0)}`, 10, row(2))
            text(`Position:   ${cam.pos.x.toFixed(1)}, ${cam.pos.y.toFixed(1)}`, 10, row(3));
            text(`Rays:       ${dirs.length}`, 10, row(4))
            text(`RayWidth:   ${raywidth.toFixed(1)}`, 10, row(5));
            text(`TimePRms:   ${stats.msPerRay.toPrecision(3)}`, 10, row(6));
            text(`AvgTPRms:   ${(stats.msPerRaySum / stats.msPerRayCount).toPrecision(3)}`, 10, row(7));
            text(`TilesChkPR: ${stats.tilesCheckedPerRay.toPrecision(3)}`, 10, row(8));
            text(`AvgTlChkPR: ${(stats.tilesCheckedPerRaySum / stats.tilesCheckedPerRayCount).toPrecision(3)}`, 10, row(9));
            text(`RaysMethod: ${toggles.raysMethod}`, 10, row(10));
            text(`Fov(deg):   ${(cam.fov * (180 / PI)).toFixed(1)}`, 10, row(11));
        }

    }

    // display messages
    push();
    textFont("monospace");
    textSize(24);
    textAlign(CENTER);
    fill(255);
    stroke(0);
    msgs.show(width / 2, height - 50);
    pop();
}

/**
 * a simple function to calculate the y-position of text based on a "row".
 * used in displaying statistics.
 * @param {number} n row number
 */
function row(n) {
    return 15 * (n + 1);
}

/**
 * handle key presses that control toggle-able options.
 */
function keyPressed() {
    if (keyCode === 32) { // space
        toggles.mapView = !toggles.mapView;
        toggles.viewChanged = true;
    }
    if (keyCode === 83) { // s key
        toggles.statsDisplay = !toggles.statsDisplay;
        toggles.showRays = !toggles.showRays; // TODO: piggyback for now
        toggles.viewChanged = true;
    }
    if (keyCode === 72) { // h key
        toggles.hideMaze = !toggles.hideMaze;
        toggles.viewChanged = true;
    }
    if (keyCode === SHIFT) {
        toggles.raysMethod = toggles.raysMethod == "slerp" ? "lerp" : "slerp";
    }
}

/**
 * respond to window resized events by recalculating the rendering parameters, etc.
 */
function windowResized() {
    resizeCanvas(windowWidth, windowHeight - 5, true);
    calculateRenderingParams();
    cam = new Camera(cam.pos.x, cam.pos.y, cam.rot); // remake camera in old position
}

/**
 * set up params for doing rendering calcs
 */
function calculateRenderingParams() {
    if (width > height) {
        scalef = Math.ceil(height / (gridh + 1));
    } else {
        scalef = Math.ceil(width / (gridw + 1));
    }

    raywidth = Math.ceil((height / width) * (width / 300)); // apparently the KEY was h/w instead of w/h??
    dirs = new Array(Math.ceil(width / raywidth));
    for (let i = 0; i < dirs.length; i++) { dirs[i] = createVector(); }
    bg = createBackgroundImage(width, height, 1);
}

/**
 * Generate the 'bg' image used as the background (floor and ceiling) of
 * the 3D view.
 * @param {number} width window width
 * @param {number} height window height
 * @param {number} barHeight 
 */
function createBackgroundImage(width, height, barHeight) {
    let bg = createGraphics(width, height);
    bg.background(0);
    const hh = height / 2;
    const maxh = hh / barHeight
    for (let h = 0; h < maxh; h++) {
        let c = 100 * (1 - h / maxh);
        bg.fill(c);
        bg.stroke(c);
        bg.rect(0, hh, width, -(hh - h * barHeight)); // ceiling
        bg.rect(0, hh, width, hh - h * barHeight); // floor
    }
    return bg;
}

/**
 * initialize system.
 */
function createGridAndPlaceCam() {
    grid = new Grid(gridw, gridh, makeGridColor(0, 200, 200));
    let pos = findPlaceNotInWall(grid.data);
    cam = new Camera(pos.x, pos.y);
}

/**
 * Camera encapsulates the point of view of the player.
 * Most importantly, it generates rays to cast and manages wall collision.
 */
class Camera {
    /**
     * create a camera.
     * @param {number} x x position
     * @param {number} y y position
     * @param {number} rot initial angle in radians
     * @param {number} fov desired field of view.
     */
    constructor(x = 0, y = 0, rot = 0, fov = QUARTER_PI) {
        this.pos = createVector(x, y);
        this.prevPos = createVector();
        this.rot = rot; //radians
        this.moved = true;
        this.fov = fov * (width / height); // scale ideal fov by aspect ratio
    }

    /**
     * rotate camera counter clockwise
     * @param {number} speed rotation speed
     */
    rotateCCW(speed = PI / 180) {
        this.rot += speed;
        if (this.rot > TWO_PI) {
            this.rot -= TWO_PI; // keep in [0,2PI]
        }
        this.moved = true;
    }

    /**
     * rotate camera clockwise
     * @param {number} speed rotation speed
     */
    rotateCW(speed = PI / 180) {
        this.rot -= speed;
        if (this.rot < 0) {
            this.rot = TWO_PI - this.rot; // keep in [0,2PI]
        }
        this.moved = true;
    }

    /**
     * move camera forward
     * @param {number} speed move speed
     */
    moveForward(speed = 0.02) {
        this.prevPos.x = this.pos.x;
        this.prevPos.y = this.pos.y;
        this.pos.x += Math.cos(this.rot) * speed;
        this.pos.y += Math.sin(this.rot) * speed;
        this.moved = true;
    }

    /**
     * move camera backward
     * @param {number} speed move speed
     */
    moveBackward(speed = 0.02) {
        this.moveForward(-speed);
    }

    /**
     * check if camera has moved since the last time this method was called.
     * this is used in the draw() function as part of check to redraw
     * a frame or not.
     */
    hasMoved() {
        let temp = this.moved;
        this.moved = false;
        return temp;
    }

    /**
     * generate a list of direction vectors (rays) to cast from the camera
     * out into the world. 
     * 
     * The rays are an arc covering "FOV" radians and
     * centered at the camera's current rotation direction (ie the direction
     * the player is looking). 
     * 
     * The method can use either a vector "lerp" or 
     * "slerp" method to generate rays, and the user can toggle this. Usually
     * "lerp" is good enough and a little faster even though "slerp" is 
     * technically more correct.
     * @param {p5.Vector[]} directions list contents will be overwritten
     */
    getRays(directions) {
        // use length of directions list to determine how many to "cast"
        let n = directions.length;
        if (toggles.raysMethod == "lerp") { // lerp
            let start = p5.Vector.fromAngle(this.rot - this.fov / 2);
            let end = p5.Vector.fromAngle(this.rot + this.fov / 2);
            directions[0] = start;
            for (let i = 1; i <= n - 2; i++) {
                directions[i].x = lerp(start.x, end.x, i / (n - 1));
                directions[i].y = lerp(start.y, end.y, i / (n - 1));
                directions[i].normalize();
            }
            directions[n - 1] = end;
            return directions;
        } else { //slerp(ish)
            const dtheta = this.fov / (n - 1);
            for (let i = 0; i < n; i++) {
                let theta = (this.rot - this.fov / 2) + i * dtheta;
                directions[i].x = Math.cos(theta);
                directions[i].y = Math.sin(theta);
            }
            return directions;
        }
    }

    /**
     * Checks for wall collision, including the EXIT. Resets the maze if
     * the exit is found.
     * @param {Grid} grid 
     */
    checkCollisions(grid) {
        if (grid.match(this.pos.x, this.pos.y, EXIT)) {
            console.log("found exit");
            createGridAndPlaceCam();
            return;
        }
        this.correctWallViolation(grid);
    }

    /**
     * Does the actual work of wall collision detection and correction.
     * @param {Grid} grid 
     */
    correctWallViolation(grid) {
        let wall = grid.match(this.pos.x, this.pos.y, SOLID);
        if (wall) {
            // inside a wall
            this.pos.x = this.prevPos.x;
            this.pos.y = this.prevPos.y;
        }
    }
}

/**
 * Hit encapsulates the results of a ray hitting a wall.
 */
class Hit {
    constructor() {
        this.pos = createVector();
        this.gridpos = createVector();
        this.cell = 0;
        this.d = 0;
    }
}

/**
 * The marchRay function uses a style of "raycasting" inspired by the 
 * Wolfenstein 3D game--not actual ray casting in the normal sense (intersecting
 * geometries), and not ray marching (using distance functions).
 * 
 * A ray moves across a regular grid of "walls" and 
 * "free space". If the grid square is free space, the position on the opposite
 * side of the grid square is calculated to determine which grid square the ray
 * hits next. This process repeats until a wall is hit.
 * 
 * This is done basically by determining where the ray hits on the "horizontal"
 * lines between grid cells and on the "vertical" lines between cells. The 
 * new position is the closest of these 2 intersection points.
 * 
 * See this video for a good explanation of how this style of raycasting works:
 * https://www.youtube.com/watch?v=eOCQfxRQ2pY
 * 
 * @param {Hit} hit the result of the cast. will be modfied by function.
 * @param {p5.Vector} dir direction of the ray to cast
 * @param {p5.Vector} pos starting position of the ray (camera's location)
 * @param {Grid} grid the 'world'
 */
function marchRay(hit, pos, dir, grid) {
    let starttime = Date.now();
    let posOrig = pos;
    pos = pos.copy();
    let wall = grid.match(pos.x, pos.y, SOLID);

    let p1 = createVector();
    let p2 = createVector();
    while (!wall) {
        p1.x = 0; p1.y = 0; p2.x = 0; p2.y = 0;

        if (dir.x > 0) {
            p1.x = Math.ceil(pos.x);
        } else if (dir.x < 0) {
            p1.x = Math.floor(pos.x);
        }
        if (dir.y > 0) {
            p2.y = Math.ceil(pos.y);
        } else if (dir.y < 0) {
            p2.y = Math.floor(pos.y);
        }

        p1.y = pos.y + dir.y * ((p1.x - pos.x) / dir.x);
        p2.x = pos.x + dir.x * ((p2.y - pos.y) / dir.y);

        let p1len = p5.Vector.dist(pos, p1);
        let p2len = p5.Vector.dist(pos, p2);

        if (p1len <= p2len) {
            pos.set(p1);
        } else {
            pos.set(p2);
        }
        pos.x += dir.x * 0.00000001; // offset the new position slightly
        pos.y += dir.y * 0.00000001; // to ensure the 'next' cell is checked.
        wall = grid.match(pos.x, pos.y, SOLID);

        stats.tilesCheckedPerRay++;
    }

    hit.pos.set(pos);
    hit.cell = grid.cell(pos.x, pos.y);
    hit.d = p5.Vector.dist(posOrig, pos);
    hit.gridpos = getCellCoords(pos);

    stats.msPerRay += Date.now() - starttime;

    return hit;
}

/**
 * gets the grid cell indices from a position.
 * @param {p5.Vector} pos 
 */
function getCellCoords(pos) {
    let gridx = Math.floor(pos.x);
    let gridy = Math.floor(pos.y);
    return createVector(gridx, gridy);
}

/**
 * Grid encapsulates the world. Cells are represented with a 32-bit integer
 * value. The lowest byte is a series of bitflags indicating things such as if
 * the cell is a wall. The higher 3 bytes are used to encode the cell's color
 * (or perhaps texture if I had gotten that far). So there are a lot of
 * bitwise operations performed in later grid/maze manipulation functions.
 */
class Grid {
    /**
     * creates a new grid using wilson's maze generation algorithm.
     */
    constructor(width, height, wallColor = COLOR_W, exitColor = COLOR_G) {
        this.data = generateGridWilson(width, height, wallColor);
        makeExteriorWalls(this.data, wallColor);
        placeExit(this.data, exitColor);
        hideMazePassages(this.data, wallColor);
        this.height = this.data.length;
        this.width = this.data[0].length;
    }

    /**
     * Get the data associated with the cell.
     * @param {number} x 
     * @param {number} y 
     * @return {number}
     */
    cell(x, y) {
        let gridx = Math.floor(x);
        let gridy = Math.floor(y);
        return this.data[gridy][gridx];
    }

    /**
     * Checks if the cell has the given flags set.
     * @param {number} x 
     * @param {number} y 
     * @param {number} flags set of bitflags to test against the cell
     */
    match(x, y, flags) {
        return cellIs(this.cell(x, y), flags);
    }

    /**
     * unsets the "hidden" flag for the cell.
     * @param {number} x 
     * @param {number} y 
     */
    unhideCell(x, y) {
        let gridx = Math.floor(x);
        let gridy = Math.floor(y);
        this.data[gridy][gridx] &= ~HIDDEN; // unset hidden flag.
    }
}

/**
 * Does the actual work of checking bitflags.
 * @param {number} cell cell's data
 * @param {number} flags bitflags to check
 */
function cellIs(cell, flags) {
    return (cell & flags) == flags;
}

/**
 * This basically just goes around the edge of the grid and makes every
 * cell solid.
 * @param {number[][]} grid the 'world' grid in raw data form
 */
function makeExteriorWalls(grid, color) {
    for (let y = 0; y < grid.length; y++) {
        if (y == 0 || y == grid.length - 1) {
            for (let x = 0; x < grid[y].length; x++) {
                grid[y][x] = SOLID | color;
            }
        } else {
            grid[y][0] = SOLID | color;
            grid[y][grid[y].length - 1] = SOLID | color;
        }
    }
}

/**
 * This basically sets the 'hidden' flag on all non-wall cells.
 * @param {number[][]} grid the 'world' grid in raw data form
 */
function hideMazePassages(grid, wallColor) {
    // TODO: i could just set and unset the color. better? worse?
    for (let y = 1; y < grid.length - 1; y++) {
        for (let x = 1; x < grid[y].length - 1; x++) {
            if (!cellIs(grid[y][x], SOLID)) {
                grid[y][x] |= HIDDEN | wallColor;
            }
        }
    }
}

/**
 * places the exit in a wall in a random location that is guaranteed to be 
 * accessible to the player.
 * @param {number[][]} grid the 'world' grid in raw data form.
 * @param {number} color color of the exit
 */
function placeExit(grid, color) {
    // start not in wall. take random walk until hitting a wall.
    let pos = findPlaceNotInWall(grid);
    let inWall = false;
    while (!inWall) {
        takeRandomStep(pos);
        inWall = cellIs(grid[Math.floor(pos.y)][Math.floor(pos.x)], SOLID);
    }
    grid[Math.floor(pos.y)][Math.floor(pos.x)] = EXIT | color;
}

/**
 * Steps through each position and generates a grid cell with the value
 * returned from function "f".
 * @param {number} w width of grid
 * @param {number} h height of grid
 * @param {number} wallColor
 * @param {(x,y,w,h,wc)=>number} f function returning the cell data given the x,y grid position
 * @returns {number[][]}
 */
function generateGridRandom(w, h, wallColor,
    f = (x, y, w, h, wc) => Math.random() < 0.2 ? SOLID | wc : NONE) {
    let grid = new Array(h);
    for (let y = 0; y < h; y++) {
        grid[y] = new Array(w);
        for (let x = 0; x < w; x++) {
            grid[y][x] |= f(x, y, w, h, wallColor);
        }
    }
    return grid;
}

/**
 * generates a grid completely of walls
 * @param {number} w width
 * @param {number} h height
 * @param {number} wallColor 
 */
function generateSolidGrid(w, h, wallColor) {
    let grid = new Array(h);
    for (let y = 0; y < grid.length; y++) {
        grid[y] = new Array(w);
        for (let x = 0; x < grid[y].length; x++) {
            grid[y][x] = SOLID | wallColor;
        }
    }
    return grid;
}

/**
 * Generates a grid of random walks which may overlap. This is like a worm
 * eating out passages in a block of wood.
 * @param {number} w width
 * @param {number} h height
 * @param {number} wallColor 
 * @param {number} walkLen length of the random walks to take
 * @param {number} numWalks the number of random walks to take
 */
function generateGridRandomWalks(w, h, wallColor, walkLen, numWalks) {
    // create grid completely solid
    let grid = generateSolidGrid(w, h, wallColor);

    // carve out numWalks random walks
    for (let n = 0; n < numWalks; n++) {
        let pos = createVector(Math.floor(random(1, w)), Math.floor(random(1, h)));
        for (let step = 0; step < walkLen; step++) {
            grid[pos.y][pos.x] = NONE;
            takeRandomStep(pos);
            pos.x = constrain(pos.x, 1, w - 1);
            pos.y = constrain(pos.y, 1, h - 1);
        }
    }

    return grid;
}

/**
 * Create a grid/maze using Wilson's Algorithm. 
 * 
 * Wilson's basically creates a maze by taking acyclic random walks that
 * start in a "wall" part of the maze and end in a "passage" part of the maze.
 * For a good description of the algorithm, see: 
 * http://weblog.jamisbuck.org/2011/1/20/maze-generation-wilson-s-algorithm
 * @param {number} w width
 * @param {number} h height
 * @param {number} wallColor 
 */
function generateGridWilson(w, h, wallColor) {
    // flags for maze (top, right, bottom, left)
    const T = 1;
    const R = 2;
    const B = 4;
    const L = 8;
    const IN = 16; // in maze (aka already added)
    // create completely solid maze
    const mw = Math.floor(w / 2);
    const mh = Math.floor(h / 2);
    let maze = new Array(mh);
    for (let y = 0; y < mh; y++) {
        maze[y] = new Array(mw);
        for (let x = 0; x < mw; x++) {
            maze[y][x] = T | R | B | L; // set all 'walls'
        }
    }

    // 0. choose inital place not IN to set to IN
    let notIn = () => randPosPredicate(maze, true, (x, y) => (maze[y][x] & IN) == 0);
    let pos = notIn();
    maze[pos.y][pos.x] |= IN;
    let visted = [];
    while ((pos = notIn()) != undefined) {
        // 1. choose a random place in maze not IN, add to visited
        // pos = randPosPredicate(maze, true, (x, y) => (maze[y][x] & IN) == 0);
        visted.push(pos.copy());

        let takingAWalk = true;
        while (takingAWalk) {
            // 2. take random walk, keeping list of visited cells
            takeRandomStep(pos);
            pos.x = constrain(pos.x, 0, mw - 1); // don't leave maze
            pos.y = constrain(pos.y, 0, mh - 1);
            visted.push(pos.copy());
            // 3. if visit a cell that is IN, stop
            if ((maze[pos.y][pos.x] & IN) == IN) {
                takingAWalk = false;
            } else {
                // 3.5 if visit a previously visted cell, delete the loop from the list
                let prev = visted.findIndex((p) => pos.x == p.x && pos.y == p.y);
                if (prev > -1 && prev < visted.length - 1) {
                    visted = visted.slice(0, prev + 1); // keep 0-prev. discards looped walk path
                }
            }
        }

        // 4. use the generated list of visited cells to 'carve' path. set cells as IN.
        for (let i = 1; i < visted.length; i++) {
            let d = p5.Vector.sub(visted[i], visted[i - 1]);
            let x = visted[i].x;
            let y = visted[i].y;
            // remove walls. maze[0][0] is in "top left"
            if (d.x == 0 && d.y == 1) { // moved down
                maze[y][x] &= ~T;
                maze[y - d.y][x - d.x] &= ~B;
            } else if (d.x == 0 && d.y == -1) { // moved up
                maze[y][x] &= ~B;
                maze[y - d.y][x - d.x] &= ~T;
            } else if (d.x == 1 && d.y == 0) { // moved right
                maze[y][x] &= ~L;
                maze[y - d.y][x - d.x] &= ~R;
            } else if (d.x == -1 && d.y == 0) { // moved left
                maze[y][x] &= ~R;
                maze[y - d.y][x - d.x] &= ~L;
            }
            // set IN
            maze[y][x] |= IN;
            maze[y - d.y][x - d.x] |= IN;
        }
        // 5. go to 1
        visted = []; // clear array
        // pos = randPosPredicate(maze, true, (x, y) => (maze[y][x] & IN) == 0);
    }

    // for testing
    // push();
    // background(50);
    // translate(10, 10);
    // stroke(255);
    // strokeWeight(0.1);
    // scale(20);
    // for (let y = 0; y < mh; y++) {
    //     for (let x = 0; x < mw; x++) {
    //         for (const w of [T, R, B, L]) {
    //             switch (maze[y][x] & w) {
    //                 case T:
    //                     line(x, y, x + 1, y);
    //                     break;
    //                 case R:
    //                     line(x + 1, y, x + 1, y + 1);
    //                     break;
    //                 case B:
    //                     line(x, y + 1, x + 1, y + 1);
    //                     break;
    //                 case L:
    //                     line(x, y, x, y + 1);
    //                     break;
    //             }
    //         }
    //     }
    // }
    // noLoop();
    // pop();

    // convert maze to grid by asking for a wide solid grid, then carving out
    // grid cells where according to the connected cells in the maze.
    // simple func to convert a maze index to a 'grid' index
    // grid_index = maze_index*2 + 1
    let gi = (mi) => (mi * 2) + 1;
    let grid = generateSolidGrid(gi(mw), gi(mh), wallColor);
    for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
            // carve out the current part of the maze
            grid[gi(y)][gi(x)] = NONE;
            // cut out appropriate adjacent walls
            if ((maze[y][x] & T) == 0) {
                grid[gi(y) - 1][gi(x)] = NONE;
            }
            if ((maze[y][x] & B) == 0) {
                grid[gi(y) + 1][gi(x)] = NONE;
            }
            if ((maze[y][x] & R) == 0) {
                grid[gi(y)][gi(x) + 1] = NONE;
            }
            if ((maze[y][x] & L) == 0) {
                grid[gi(y)][gi(x) - 1] = NONE;
            }
        }
    }

    return grid;
}

/**
 * Moves pos a step in the x or y direction (not diagonally)
 * @param {p5.Vector} pos 
 */
function takeRandomStep(pos, stepsize = 1) {
    switch (Math.floor(random(4))) {
        case 0:
            pos.x += stepsize;
            break;
        case 1:
            pos.x -= stepsize;
            break;
        case 2:
            pos.y += stepsize;
            break;
        case 3:
            pos.y -= stepsize;
            break;
    }
    return pos;
}

/**
 * finds a random location that is not in a wall by making a list
 * of the centers of all non-wall cells, then choosing one randomly.
 * @param {number[][]} grid raw grid data
 * @returns {p5.Vector|undefined} position or undefined
 */
function findPlaceNotInWall(grid) {
    const gw = grid[0].length;
    const gh = grid.length;
    let halls = [];
    for (let y = 1; y < gh - 1; y++) {
        for (let x = 1; x < gw - 1; x++) {
            if (!cellIs(grid[y][x], SOLID)) {
                halls.push(createVector(x + 0.5, y + 0.5)); // add 0.5 to get in middle of cell
            }
        }
    }
    return random(halls);
}

/**
 * Finds a random grid cell where "predicate" evaluates to true. Does this by
 * making a list of all matching cells and returning a random one.
 * @param {number[][]} grid raw grid data
 * @param {boolean} incOuterWall true to include the outer most 'layer' of cells in search.
 * @param {(x:number,y:number)=>boolean} predicate func to return true if cell is to be possibly randomly selected
 * @returns {p5.Vector|undefined} position or undefined if there are no walls (other than exterior)
 */
function randPosPredicate(grid, incOuterWall = false, predicate = (x, y) => cellIs(grid[y][x], SOLID)) {
    const gh = grid.length;
    const gw = grid[0].length;
    const ow = incOuterWall ? 1 : 0;
    let walls = [];
    for (let y = 1 - ow; y < gh - 1 + ow; y++) {
        for (let x = 1 - ow; x < gw - 1 + ow; x++) {
            if (predicate(x, y)) {
                walls.push(createVector(x, y));
            }
        }
    }
    return random(walls);
}

/**
 * Converts the 3 high bytes of a cell's data to a color (in the form of
 * a 3d vector).
 * @param {number} cell cell's data
 * @return {p5.Vector}
 */
function colorFromCell(cell) {
    return createVector(
        (cell & COLOR_R) >>> R_SHIFT,
        (cell & COLOR_G) >>> G_SHIFT,
        (cell & COLOR_B) >>> B_SHIFT
    );
}

/**
 * converts a color stored in a p5.Vector to a p5.Color.
 * @param {p5.Vector} v color as a vector
 */
function vecToColor(v) {
    return color(v.x, v.y, v.z);
}

/**
 * Encodes a color (as RGB) to the 3 high bytes used in a cell's data.
 * @param {number} r 
 * @param {number} g 0-3
 * @param {number} b 0-3
 */
function makeGridColor(r, g, b) {
    return r << R_SHIFT | g << G_SHIFT | b << B_SHIFT;
}

/**
 * MessageQueue is used to enque messages to be shown on the screen for
 * a certain duration.
 */
class MessageQueue {
    constructor() {
        this.queue = [];
    }

    /**
     * enqueues the messages to be shown for the given duration.
     * @param {number} duration number of seconds to show messages
     * @param  {...any} messages message(s) to show
     */
    add(duration, ...messages) {
        for (const m of messages) {
            this.queue.push({ d: duration, m: m });
        }
    }

    /**
     * Draws the messages on the screen in the order they were enqueued. It also
     * subtracts time from each message's duration and removes expired messages.
     * @param {number} x x position of message
     * @param {number} y y position of message
     */
    show(x, y) {
        // subract time and remove expired messages
        const dt = Math.min(1 / frameRate(), 1 / 120);
        this.queue.forEach(v => v.d -= dt);
        this.queue = this.queue.filter(v => v.d > 0);
        // display remaining messages in the order they were enqueued
        const tsize = textSize();
        for (let i = 0; i < this.queue.length; i++) {
            text(this.queue[i].m, x, y - i * tsize); // TODO: make an option to display oldest on top or bottom
        }
    }
}


// masks
// cells are 32 bits (4 bytes).
// the low byte is flags.
// the high 3 bytes are for color or texture info.
//
const NONE = 0;
const SOLID = 0b00000001;
const ENTRY = 0b00000010;
const EXIT = SOLID | ENTRY;
const HIDDEN = 0b00000100;

const R_SHIFT = 24;
const G_SHIFT = 16;
const B_SHIFT = 8;
const COLOR_R = 0xFF << R_SHIFT;
const COLOR_G = 0xFF << G_SHIFT;
const COLOR_B = 0xFF << B_SHIFT;
const COLOR_W = COLOR_R | COLOR_G | COLOR_B;
