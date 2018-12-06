
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

const gridw = 25;
const gridh = 25;

let scalef = 1;
let raywidth = 2; // alters number of rays used/"resolution" of walls

function setup() {
    createCanvas(windowWidth, windowHeight - 5);

    calculateRenderingParams();
    createGridAndPlaceCam();
}


// needed for toggling between map/3d view, and flagging a redraw
let mapView = false;
let viewChanged = true;

function draw() {

    if (keyIsDown(LEFT_ARROW) || (mouseIsPressed && mouseX < width / 3)) {
        cam.rotateCCW();
    }
    if (keyIsDown(RIGHT_ARROW) || (mouseIsPressed && mouseX >= 2 / 3 * width)) {
        cam.rotateCW();
    }
    if (keyIsDown(UP_ARROW) || (mouseIsPressed && mouseY < height / 3)) {
        cam.moveForward();
    }
    if (keyIsDown(DOWN_ARROW) || (mouseIsPressed && mouseY >= 2 / 3 * height)) {
        cam.moveBackward();
    }

    cam.checkCollisions(grid);

    if (cam.hasMoved() || viewChanged) {
        background(0);
        viewChanged = false;

        if (mapView) {
            // 2d map view
            push();
            translate(0, height);
            scale(scalef, -scalef);

            noStroke();
            for (let y = 0; y < grid.height; y++) {
                for (let x = 0; x < grid.width; x++) {
                    if (grid.match(x, y, SOLID)) {
                        let c = vecToColor(colorFromCell(grid.cell(x, y)));
                        fill(c);
                        rect(x, y, 1, 1);
                    }
                }
            }

            strokeWeight(0.01);
            noFill();

            let hit = new Hit();
            for (const dir of cam.getRays(dirs)) {
                stroke(0, 0, 255);
                line(cam.pos.x, cam.pos.y, cam.pos.x + dir.x, cam.pos.y + dir.y);
                marchRay(hit, cam.pos, dir, grid)
                stroke(0, 255, 0);
                ellipse(hit.pos.x, hit.pos.y, 0.1);
            }
            pop();
        } else {
            // 3d view
            push();
            rectMode(CENTER);
            translate(0, height / 2);

            // draw ceiling and floor
            const maxh = (height / 2) / raywidth;
            for (let h = 0; h < maxh; h++) {
                let c = 100 * (h / maxh);
                fill(c);
                stroke(c);
                // floor
                rect(width / 2, (h + 0.5) * raywidth, width, raywidth);
                // ceiling
                rect(width / 2, -(h + 0.5) * raywidth, width, raywidth);
            }

            // draw walls
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


        fill(255);
        textSize(15);
        text("FPS: " + frameRate().toFixed(0), 10, 15);
        text(`POS: ${cam.pos.x.toFixed(1)}, ${cam.pos.y.toFixed(1)}`, 10, 30);
        let g = getCellCoords(cam.pos);
        text(`CELL: ${g.x.toFixed(0)}, ${g.y.toFixed(0)}`, 10, 45);
    }


}

function keyPressed() {
    if (keyCode === 32) { // space
        mapView = !mapView;
        viewChanged = true;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight - 5);
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

    raywidth = width / 400; // set raywidth according to width of screen
    raywidth *= height / width; // apparently the KEY was h/w instead of w/h??
    dirs = new Array(Math.round(width / raywidth));
}

/**
 * initialize system.
 */
function createGridAndPlaceCam() {
    grid = new Grid(gridw, gridh, makeGridColor(0, 2, 2));
    let pos = findPlaceNotInWall(grid);
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
        let start = p5.Vector.fromAngle(this.rot + this.fov / 2);
        let end = p5.Vector.fromAngle(this.rot - this.fov / 2);
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
    }

    hit.pos.set(pos);
    hit.cell = grid.cell(pos.x, pos.y);
    hit.d = p5.Vector.dist(posOrig, pos);
    hit.gridpos = getCellCoords(pos);

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
        this.data = generateGrid(width, height, wallColor);
        makeExteriorWalls(this.data, wallColor);
        placeExit(this.data, exitColor);
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
 * @param {number} color 
 */
function placeExit(grid, color) {
    const gw = grid[0].length;
    const gh = grid.length;
    let inWall = false;
    let pos = createVector();
    for (let tries = 0; tries < 20; tries++) {
        // find a non-solid cell
        while (!inWall) {
            pos.x = Math.floor(Math.random() * (gw - 2) + 1);
            pos.y = Math.floor(Math.random() * (gh - 2) + 1);
            inWall = cellIs(grid[pos.y][pos.x], SOLID);
        }
        // check that at least one neighbor is not solid
        for (let y = -1; y <= 1; y += 2) {
            for (let x = -1; x <= 1; x += 2) {
                if (!cellIs(grid[constrain(pos.y + y, 0, gh)][constrain(pos.x + x, 0, gw)], SOLID)) {
                    grid[pos.y][pos.x] = EXIT | color;
                    return;
                }
            }
        }
    }
    console.log("gave up on exit");
}

/**
 * 
 * @param {number} w 
 * @param {number} h 
 * @param {number} wallColor
 * @param {(x,y,w,h,wc)=>number} f function returning the cell data given the x,y grid position
 * @returns {number[][]}
 */
function generateGrid(w, h, wallColor,
    f = (x, y, w, h, wc) => Math.random() < 0.25 ? SOLID | wc : NONE) {
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
 * @param {Grid} grid 
 */
function findPlaceNotInWall(grid) {
    let inWall = true;
    let pos = createVector();
    while (inWall) {
        pos.x = Math.random() * (grid.width - 2) + 1;
        pos.y = Math.random() * (grid.height - 2) + 1;
        inWall = grid.match(pos.x, pos.y, SOLID);
    }
    return pos;
}

/**
 * 
 * @param {number} cell 
 * @return {p5.Vector}
 */
function colorFromCell(cell) {
    return createVector(
        255 * ((cell & COLOR_R) >> 4) / 3,
        255 * ((cell & COLOR_G) >> 2) / 3,
        255 * (cell & COLOR_B) / 3
    );
}

function vecToColor(v) {
    return color(v.x, v.y, v.z);
}

/**
 * 
 * @param {number} r 0-3
 * @param {number} g 0-3
 * @param {number} b 0-3
 */
function makeGridColor(r, g, b) {
    return r << 4 | g << 2 | b;
}


// masks
const NONE = 0;
const SOLID = 0b10000000;
const ENTRY = 0b01000000;
const EXIT = SOLID | ENTRY;
const COLOR_R = 0b00110000;
const COLOR_G = 0b00001100;
const COLOR_B = 0b00000011;
const COLOR_W = COLOR_R | COLOR_G | COLOR_B;
