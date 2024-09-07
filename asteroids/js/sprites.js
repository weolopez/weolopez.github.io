export class Sprites {
  constructor() { }
  sprites = [{
    name: "human",
    src: "./ships.png",
    max_speed: 30,
    speed: 10,
    rotationSpeed: 0,
    x: 1432, y: 15, width: 360, height: 455,
    startx: 0,//-170,
    starty: 600-235,
    // ai: this.setAim
  }, {
    name: "vulcan",
    src: "./ships.png",
    max_speed: 10,
    speed: 10,
    rotationSpeed: 0,
    x: 734, y: 13, width: 345, height: 500,
    startx: 800/.05,//-170,
    starty: 300,
  }, {
    name: "roids",
    src: "./roids.png",
    max_speed: 10,
    speed: 10,
    rotationSpeed: .01,
    scale: 3,
    x: 301, y: 279, width: 330, height: 330,
    ai: this.rockAI,
    startx: 400/.05,
    starty: 300,
  }]

  rockAI(rock, factor) {
    rock.momentumX +=  rock.speed * factor;
    rock.momentumY -=  rock.speed * factor;
  }

  setAim(spaceship, factor) {
    // randomize true or false for aimTowards
    let aimTowards = false
    let target = spaceship.target
    // Calculate the angle to the target
    const deltaX = target.x - spaceship.x;
    const deltaY = target.y - spaceship.y;
    const angleToTarget = Math.atan2(deltaY, deltaX);

    // Determine the angle to aim at or away from the target
    const angle = aimTowards ? angleToTarget : angleToTarget + Math.PI;

    // Gradually update spaceship's angle to aim at or away from the target
    spaceship.angle += (angle - spaceship.angle) * factor;

    // Gradually update spaceship's momentum based on the new angle
    spaceship.momentumX += Math.cos(spaceship.angle) * spaceship.speed * factor;
    spaceship.momentumY += Math.sin(spaceship.angle) * spaceship.speed * factor;
  }
}
