
let grid = [
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

let scalef = 50;
let raywidth = 1;

function setup() {
    createCanvas(windowWidth, windowHeight - 20);
    cam = new Camera(1.8, 1.8);
    dirs = new Array(Math.floor(width / raywidth));
    scalef *= Math.min(width, height) / 900;
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
            translate(25, height - 25);
            scale(scalef, -scalef);

            strokeWeight(0.01);
            stroke(255, 0, 0);

            for (let y = 0; y < grid.length; y++) {
                for (let x = 0; x < grid[y].length; x++) {
                    if (grid[y][x] == 0) {
                        noFill();
                    } else {
                        fill(255, 0, 0);
                    }
                    rect(x, y, 1, 1);
                }
            }
            noFill();

            for (const dir of cam.getRays(dirs)) {
                stroke(0, 0, 255);
                line(cam.pos.x, cam.pos.y, cam.pos.x + dir.x, cam.pos.y + dir.y);
                let hit = marchRay(cam.pos, dir, grid)
                stroke(0, 255, 0);
                ellipse(hit.x, hit.y, 0.1);
            }
            pop();
        } else {
            // 3d view
            push();
            rectMode(CENTER);
            noStroke();
            translate(0, height / 2);
            cam.getRays(dirs);
            for (let i = 0; i < dirs.length; i++) {
                let dir = dirs[i];
                let hit = marchRay(cam.pos, dir, grid);
                let d = p5.Vector.dist(cam.pos, hit);
                const c = 250 / constrain(d * d, 1, 1000);
                fill(c);
                rect((i + 0.5) * raywidth, 0, raywidth, height / d);
            }
            pop();
        }


        fill(255);
        // stroke(255);
        textSize(15);
        text("FPS: " + frameRate().toFixed(0), 10, 15);
        text(`POS: ${cam.pos.x.toFixed(1)}, ${cam.pos.y.toFixed(1)}`, 10, 30);
        let g = getCellCoords(cam.pos);
        text(`CELL: ${g.x.toFixed(1)}, ${g.y.toFixed(1)}`, 10, 45);
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
            directions[i] = p5.Vector.lerp(start, end, i / (n - 1)).normalize();
        }
        directions[n - 1] = end;
        return directions;
    }

    correctWallViolation(grid) {
        let cell = getCell(this.pos, grid);
        if (cell != 0) {
            // inside a wall
            this.pos.x = this.prevPos.x;
            this.pos.y = this.prevPos.y;
        }
    }
}

/**
 * 
 * @param {p5.Vector} dir 
 * @param {p5.Vector} pos 
 * @param {number[][]} grid 
 */
function marchRay(pos, dir, grid) {
    let cell = getCell(pos, grid);

    while (cell == 0) {
        let p1 = createVector();
        let p2 = createVector();
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
            pos = p1;
        } else {
            pos = p2;
        }
        pos.x += dir.x * 0.00000001;
        pos.y += dir.y * 0.00000001;
        cell = getCell(pos, grid);
    }

    return pos;
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

/**
 * 
 * @param {p5.Vector} pos 
 * @param {number[][]} grid 
 */
function getCell(pos, grid) {
    let gridx = Math.floor(pos.x);
    let gridy = Math.floor(pos.y);
    return grid[gridy][gridx];
}