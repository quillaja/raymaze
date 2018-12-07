
let griddata = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]];


/**
 * @type {Camera}
 */
let cam;
/**
 * @type {p5.Vector[]}
 */
let dirs;

/**
 * @type {Grid}
 */
let grid;

/**
 * @type {p5.Graphics}
 */
let bg;

const gridw = 25;
const gridh = 25;

// set in calculateRenderParams()
let scalef = 1; // scales map view
let raywidth = 0; // alters number of rays used/"resolution" of walls. 

const toggles = {
    mapView: false,
    hideMaze: true,
    showRays: false,
    viewChanged: true,
    statsDisplay: false,
}

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

function setup() {
    createCanvas(windowWidth, windowHeight - 5);

    calculateRenderingParams();
    createGridAndPlaceCam();
}

function draw() {

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

    cam.checkCollisions(grid);

    if (cam.hasMoved() || toggles.viewChanged) {
        background(0);
        toggles.viewChanged = false;
        stats.tilesCheckedPerRay = 0;

        grid.unhideCell(cam.pos.x, cam.pos.y);

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
            cam.getRays(dirs);
            const lookx = Math.cos(cam.rot); // calculate look direction vector
            const looky = Math.sin(cam.rot);
            let hit = new Hit();
            for (let i = 0; i < dirs.length; i++) {
                let dir = dirs[i];
                marchRay(hit, cam.pos, dir, grid);
                // dot product ray dir with look dir to scale d so straight lines look straight.
                let d = hit.d * (dir.x * lookx + dir.y * looky);
                let c = vecToColor(colorFromCell(hit.cell).div(Math.max(1, d)));
                fill(c);
                stroke(c);
                rect((i + 0.5) * raywidth, 0, raywidth, height / d);
            }
            pop();
        }

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
        }
    }


}

function row(n) {
    return 15 * (n + 1);
}

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
}

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
        scalef = Math.floor(height / gridh);
    } else {
        scalef = Math.floor(width / gridw);
    }

    raywidth = Math.ceil((height / width) * (width / 300)); // apparently the KEY was h/w instead of w/h??
    dirs = new Array(Math.ceil(width / raywidth));
    bg = createBackgroundImage(width, height, 1);
}

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

class Camera {
    constructor(x = 0, y = 0, rot = 0, fov = QUARTER_PI) {
        this.pos = createVector(x, y);
        this.prevPos = createVector();
        this.rot = rot; //radians
        this.moved = true;
        this.fov = fov * (width / height); // scale ideal fov by aspect ratio
    }

    rotateCCW(speed = PI / 100) {
        this.rot += speed;
        if (this.rot > TWO_PI) {
            this.rot -= TWO_PI; // keep in [0,2PI]
        }
        this.moved = true;
    }

    rotateCW(speed = PI / 100) {
        this.rot -= speed;
        if (this.rot < 0) {
            this.rot = TWO_PI - this.rot; // keep in [0,2PI]
        }
        this.moved = true;
    }

    moveForward(speed = 0.02) {
        this.prevPos.x = this.pos.x;
        this.prevPos.y = this.pos.y;
        this.pos.x += Math.cos(this.rot) * speed;
        this.pos.y += Math.sin(this.rot) * speed;
        this.moved = true;
    }

    moveBackward(speed = 0.02) {
        this.moveForward(-speed);
    }

    hasMoved() {
        let temp = this.moved;
        this.moved = false;
        return temp;
    }

    /**
     * 
     * @param {p5.Vector[]} directions list contents will be overwritten
     */
    getRays(directions) {
        // use length of directions list to determine how many to "cast"
        let n = directions.length;
        let start = p5.Vector.fromAngle(this.rot - this.fov / 2);
        let end = p5.Vector.fromAngle(this.rot + this.fov / 2);
        directions[0] = start;
        for (let i = 1; i <= n - 2; i++) {
            if (!directions[i]) directions[i] = createVector();
            directions[i].x = lerp(start.x, end.x, i / (n - 1));
            directions[i].y = lerp(start.y, end.y, i / (n - 1));
            directions[i].normalize();
        }
        directions[n - 1] = end;
        return directions;
    }

    /**
     * 
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
     * 
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

class Hit {
    constructor() {
        this.pos = createVector();
        this.gridpos = createVector();
        this.cell = 0;
        this.d = 0;
    }
}

/**
 * @param {Hit} hit
 * @param {p5.Vector} dir 
 * @param {p5.Vector} pos 
 * @param {Grid} grid 
 */
function marchRay(hit, pos, dir, grid) {
    let starttime = Date.now();
    let posOrig = pos;
    pos = pos.copy();
    let wall = grid.match(pos.x, pos.y, SOLID);

    let d = 0;
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
            d = p1len;
        } else {
            pos.set(p2);
            d = p2len;
        }
        pos.x += dir.x * 0.00000001;
        pos.y += dir.y * 0.00000001;
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
 * 
 * @param {p5.Vector} pos 
 */
function getCellCoords(pos) {
    let gridx = Math.floor(pos.x);
    let gridy = Math.floor(pos.y);
    return createVector(gridx, gridy);
}

class Grid {
    constructor(width, height, wallColor = COLOR_W, exitColor = COLOR_G) {
        this.width = width;
        this.height = height;
        this.data = generateGridWilson(width, height, wallColor);//generateGridRandomWalks(width, height, wallColor, 15, 60) : generateGridRandom(width, height, wallColor);
        makeExteriorWalls(this.data, wallColor);
        placeExit(this.data, exitColor);
        hideMazePassages(this.data, wallColor);
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @return {number}
     */
    cell(x, y) {
        let gridx = Math.floor(x);
        let gridy = Math.floor(y);
        return this.data[gridy][gridx];
    }

    match(x, y, flags) {
        return cellIs(this.cell(x, y), flags);
    }

    unhideCell(x, y) {
        let gridx = Math.floor(x);
        let gridy = Math.floor(y);
        this.data[gridy][gridx] &= ~HIDDEN; // unset hidden flag.
    }
}

/**
 * 
 * @param {number} cell 
 * @param {number} flags 
 */
function cellIs(cell, flags) {
    return (cell & flags) == flags;
}

/**
 * 
 * @param {number[][]} grid 
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
 * 
 * @param {number[][]} grid 
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
 * 
 * @param {number[][]} grid 
 * @param {number} color 
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
 * 
 * @param {number} w 
 * @param {number} h 
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
 * 
 * @param {number} w 
 * @param {number} h 
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
 *  
 * @param {number} w 
 * @param {number} h 
 * @param {number} wallColor 
 * @param {number} walkLen
 * @param {number} numWalks 
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
 * create a grid/maze using wilson's algorithm
 * @param {number} w 
 * @param {number} h 
 * @param {number} wallColor 
 */
function generateGridWilson(w, h, wallColor) {
    // flags for maze
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
                // 4. if visit a previously visted cell, delete the list of the loop
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

    // convert maze to grid
    // maze-index*2 + 1 = grid-index
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
 * 
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
 * 
 * @param {number[][]} grid 
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
 * 
 * @param {number[][]} grid 
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
 * 
 * @param {number} cell 
 * @return {p5.Vector}
 */
function colorFromCell(cell) {
    return createVector(
        (cell & COLOR_R) >>> R_SHIFT,
        (cell & COLOR_G) >>> G_SHIFT,
        (cell & COLOR_B) >>> B_SHIFT
    );
}

function vecToColor(v) {
    return color(v.x, v.y, v.z);
}

/**
 * 
 * @param {number} r 
 * @param {number} g 0-3
 * @param {number} b 0-3
 */
function makeGridColor(r, g, b) {
    return r << R_SHIFT | g << G_SHIFT | b << B_SHIFT;
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
