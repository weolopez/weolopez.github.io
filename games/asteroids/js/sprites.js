export class Sprites {
  constructor() { }
  sprites = [{
    name: "player_ship",
    type: "ship", 
    src: "./ships.png",
    sx: 1432, sy: 15, sWidth: 360, sHeight: 455, 
    width: 36, height: 45.5, 
    health: 100,
    max_speed: 300, 
    speed: 200, 
    rotationSpeed: Math.PI * 1.5, 
    startx: 500, 
    starty: 300,
  }, {
    name: "enemy_vulcan",
    type: "ship", 
    src: "./ships.png",
    sx: 734, sy: 13, sWidth: 345, sHeight: 500, 
    width: 34.5, height: 50, 
    health: 70,
    max_speed: 150, 
    speed: 100, 
    rotationSpeed: Math.PI, 
    preferredFlankingDistance: 250, 
    shootingRange: 400, 
    startx: 700,
    starty: 100,
    ai: this.flankingAI 
  }, {
    name: "enemy_interceptor", // New enemy type
    type: "ship",
    src: "./ships.png",
    sx: 1084, sy: 18, sWidth: 340, sHeight: 400, // Assuming different sprite coords
    width: 30, height: 35, // Smaller
    health: 40, // Less health
    max_speed: 220, // Faster
    speed: 150, // Faster acceleration
    rotationSpeed: Math.PI * 1.2, // Quicker turning
    preferredFlankingDistance: 180,
    shootingRange: 350,
    startx: 800, // Different start position
    starty: 200,
    ai: this.flankingAI // Can use the same AI or a different one later
  }, {
    name: "large_roid",
    type: "asteroid_large", 
    src: "./roids.png", 
    sx: 301, sy: 279, sWidth: 330, sHeight: 330, 
    size: 40, 
    health: 100,
    points: 20,
    speed: 50, 
    startx: 100, 
    starty: 100,
  }]

  flankingAI(aiShip, deltaTime) {
    if (!aiShip.target || !aiShip.target.isActive) {
        aiShip.rotationSpeed = 0.1 * deltaTime; 
        return;
    }

    const target = aiShip.target;
    const preferredDist = aiShip.spriteData.preferredFlankingDistance || 200;
    const shootingRange = aiShip.spriteData.shootingRange || 300;
    const turnSpeed = aiShip.spriteData.rotationSpeed || Math.PI; 
    const thrustPower = aiShip.spriteData.speed || 100; 

    const dx = target.x - aiShip.x;
    const dy = target.y - aiShip.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    const angleToTarget = Math.atan2(dy, dx);
    
    let targetX = target.x - Math.cos(angleToTarget + (Math.PI / 2)) * preferredDist;
    let targetY = target.y - Math.sin(angleToTarget + (Math.PI / 2)) * preferredDist;
    
    const dxToFlankPoint = targetX - aiShip.x;
    const dyToFlankPoint = targetY - aiShip.y;
    const angleToFlankPoint = Math.atan2(dyToFlankPoint, dxToFlankPoint);

    let angleDifference = angleToFlankPoint - aiShip.angle;
    while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
    while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

    aiShip.angle += Math.sign(angleDifference) * Math.min(Math.abs(angleDifference), turnSpeed * deltaTime);

    if (distanceToTarget > preferredDist * 0.8) { 
        aiShip.momentumX += Math.cos(aiShip.angle) * thrustPower * deltaTime;
        aiShip.momentumY += Math.sin(aiShip.angle) * thrustPower * deltaTime;
    } else if (distanceToTarget < preferredDist * 0.5) { 
        aiShip.momentumX -= Math.cos(aiShip.angle) * thrustPower * 0.5 * deltaTime;
        aiShip.momentumY -= Math.sin(aiShip.angle) * thrustPower * 0.5 * deltaTime;
    }

    let directAngleToPlayer = Math.atan2(target.y - aiShip.y, target.x - aiShip.x);
    let aimDifference = directAngleToPlayer - aiShip.angle;
    while (aimDifference > Math.PI) aimDifference -= 2 * Math.PI;
    while (aimDifference < -Math.PI) aimDifference += 2 * Math.PI;

    if (distanceToTarget < shootingRange && Math.abs(aimDifference) < 0.2) { 
        if (aiShip.currentWeapon && aiShip.currentWeapon.canFire()) {
            aiShip.shoot();
        }
    }
  }
}
