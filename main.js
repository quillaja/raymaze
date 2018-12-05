
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

let scalef = 1;
let raywidth = 2; // alters number of rays used/"resolution" of walls

function setup() {
    createCanvas(windowWidth, windowHeight - 15);

    let gw = 25;//griddata[0].length;
    let gh = 25;//griddata.length;

    if (width > height) {
        scalef = Math.floor(height / gh);
    } else {
        scalef = Math.floor(width / gw);
    }

    grid = new Grid(gw, gh);
    // scalef *= Math.min(width, height) / 900;
    dirs = new Array(Math.floor(width / raywidth));
    let pos = findPlaceNotInWall(grid);
    cam = new Camera(pos.x, pos.y);
}

function draw() {

    let mapView = false;
    let viewChanged = true;

    if (keyIsDown(LEFT_ARROW)) {
        cam.rotateCCW();
    }
    if (keyIsDown(RIGHT_ARROW)) {
        cam.rotateCW();
    }
    if (keyIsDown(UP_ARROW)) {
        cam.moveForward();
    }
    if (keyIsDown(DOWN_ARROW)) {
        cam.moveBackward();
    }
    if (keyIsDown(32)) {
        viewChanged = !mapView;
        mapView = true;
    } else {
        viewChanged = mapView;
        mapView = false;
    }

    cam.correctWallViolation(grid);

    if (cam.hasMoved() || viewChanged) {
        background(0);
        viewChanged = false;

        if (mapView) {
            // 2d map view
            push();
            translate(0, height);
            scale(scalef, -scalef);

            strokeWeight(0.01);
            stroke(255, 0, 0);

            for (let y = 0; y < grid.height; y++) {
                for (let x = 0; x < grid.width; x++) {
                    if (grid.cell(x, y) == 0) {
                        noFill();
                    } else {
                        fill(255, 0, 0);
                    }
                    rect(x, y, 1, 1);
                }
            }
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
            noStroke();
            translate(0, height / 2);
            cam.getRays(dirs);
            let hit = new Hit();
            for (let i = 0; i < dirs.length; i++) {
                let dir = dirs[i];
                marchRay(hit, cam.pos, dir, grid);
                let d = hit.d;
                const c = 250 / constrain(d, 1, 1000);
                fill(c);
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

class Camera {
    constructor(x = 0, y = 0, fov = QUARTER_PI) {
        this.pos = createVector(x, y);
        this.prevPos = createVector();
        this.rot = 0; //radians
        this.moved = true;
        this.fov = fov;
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
    correctWallViolation(grid) {
        let cell = grid.getCell(this.pos);
        if (cell != 0) {
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
    let cell = grid.getCell(pos);

    let d = 0;
    let p1 = createVector();
    let p2 = createVector();
    while (cell == 0) {
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
        cell = grid.getCell(pos);
    }

    hit.pos.set(pos);
    hit.cell = cell;
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
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = generateGrid(width, height);
    }

    /**
     * 
     * @param {number} x index
     * @param {number} y index
     * @return {number}
     */
    cell(x, y) {
        return this.data[y][x];
    }

    /**
     * 
     * @param {p5.Vector} pos 
     */
    getCell(pos) {
        let gridx = Math.floor(pos.x);
        let gridy = Math.floor(pos.y);
        return this.data[gridy][gridx];
    }
}

/**
 * 
 * @param {number[][]} grid 
 */
function makeExteriorWalls(grid) {
    for (let y = 0; y < grid.length; y++) {
        if (y == 0 || y == grid.length - 1) {
            for (let x = 0; x < grid[y].length; x++) {
                grid[y][x] = 1;
            }
        } else {
            grid[y][0] = 1;
            grid[y][grid[y].length - 1] = 1;
        }
    }
}

/**
 * 
 * @param {number} w 
 * @param {number} h 
 * @param {(x,y)=>number} f function returning the cell data given the x,y grid position
 */
function generateGrid(w, h,
    f = (x, y) => Math.random() < 0.25 ? 1 : 0) {
    let grid = new Array(h);
    for (let y = 0; y < h; y++) {
        grid[y] = new Array(w);
        for (let x = 0; x < w; x++) {
            grid[y][x] = f(x, y);
        }
    }
    makeExteriorWalls(grid);
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
        inWall = grid.getCell(pos) == 1;
    }
    return pos;
}

/**
 * 
 * @param {number} cell 
 * @return {p5.Color}
 */
function colorFromCell(cell) {
    return color(
        255 * cell & COLOR_R >> 2,
        255 * cell & COLOR_G >> 1,
        255 * cell & COLOR_B);
}

// masks
const SOLID = 0b10000000;
const EXIT = 0b01000000;
const ENTRANCE = 0b00100000;
const COLOR_R = 0b00000100;
const COLOR_G = 0b00000010;
const COLOR_B = 0b00000001;
