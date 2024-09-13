export class Sprites {
  constructor() { }
  sprites = [{
    name: "human",
    src: "./ships.png",
    max_speed: 30,
    speed: 1,
    rotationSpeed: 0,
    x: 1432, y: 15, width: 360, height: 455,
    startx: 5000,
    starty: 6000,
  }, {
    name: "vulcan",
    src: "./ships.png",
    max_speed: 10,
    speed: 1,
    rotationSpeed: 0,
    x: 734, y: 13, width: 345, height: 500,
    startx: 700,
    starty: 300,
    ai: this.setAim
  }, {
    name: "roids",
    src: "./roids.png",
    max_speed: 10,
    speed: 0,
    rotationSpeed: 0,
    // scale: 3,
    x: 301, y: 279, width: 330, height: 330,
    ai: this.rockAI,
    startx: 4000,
    starty: 300,
  }]

  rockAI(rock, factor) {
    rock.momentumX +=  rock.speed * factor;
    rock.momentumY -=  rock.speed * factor;
  }

  setAim(spaceship, factor) {
    let aimTowards = false  
    let target = spaceship.target
    const deltaX = target.x - spaceship.x;
    const deltaY = target.y - spaceship.y;
    const angleToTarget = Math.atan2(deltaY, deltaX);
    const angle = aimTowards ? angleToTarget : angleToTarget + Math.PI;
    spaceship.angle += (angle - spaceship.angle) * factor;
    spaceship.momentumX += Math.cos(spaceship.angle) * spaceship.speed * factor;
    spaceship.momentumY += Math.sin(spaceship.angle) * spaceship.speed * factor;
  }
}
