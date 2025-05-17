export class Sprites {
  constructor() { }
  sprites = [{
    name: "player_ship", // Interceptor Model
    type: "ship",
    src: "./ships.png",
    sx: 1432, sy: 15, sWidth: 360, sHeight: 455,
    width: 36, height: 45.5,
    health: 100,
    max_speed: 300,
    thrust: 12, // Renamed from speed, represents acceleration force
    rotationSpeed: Math.PI * 1.5,
    startx: 500,
    starty: 300,
    weapons: [
      { type: "laser", name: "Standard Laser", fireRate: 5, projectileDamage: 10 },
      { type: "plasma", name: "Standard Plasma", fireRate: 1.5, projectileDamage: 35 }
    ],
    defaultWeaponType: "laser",
    description: "A well-rounded interceptor, agile and versatile."
  }, {
    name: "player_swift", // Scout Model
    type: "ship",
    src: "./ships.png",
    sx: 1084, sy: 18, sWidth: 340, sHeight: 400,
    width: 30, height: 35,
    health: 60, // Lower health
    max_speed: 420, // Much Faster
    thrust: 18, // Higher acceleration
    rotationSpeed: Math.PI * 2.0, // Very agile
    startx: 500, starty: 300,
    weapons: [
      { type: "laser", name: "Rapid Fire Laser", fireRate: 8, projectileDamage: 7 },
      { type: "plasma", name: "Quick Plasma Shot", fireRate: 2.5, projectileDamage: 25 }
    ],
    defaultWeaponType: "laser",
    description: "A nimble scout, prioritizing speed and maneuverability over armor."
  }, {
    name: "player_tank", // Heavy Fighter Model
    type: "ship",
    src: "./ships.png",
    sx: 734, sy: 13, sWidth: 345, sHeight: 500,
    width: 42, height: 60, // Larger
    health: 180, // Much More health
    max_speed: 200, // Much Slower
    thrust: 8, // Lower acceleration
    rotationSpeed: Math.PI * 0.9, // Less agile
    startx: 500, starty: 300,
    weapons: [
      { type: "laser", name: "Heavy Cannon", fireRate: 3, projectileDamage: 18 },
      { type: "plasma", name: "Devastator Plasma", fireRate: 1, projectileDamage: 60 }
    ],
    defaultWeaponType: "laser",
    description: "A heavily armored fighter, slow but durable with powerful weaponry."
  }, {
    name: "player_balanced", // Assault Model - New
    type: "ship",
    src: "./ships.png", // Placeholder sprite - needs unique coordinates
    sx: 400, sy: 0, sWidth: 320, sHeight: 400, // Example new sprite coords
    width: 34, height: 40,
    health: 120,
    max_speed: 280,
    thrust: 10,
    rotationSpeed: Math.PI * 1.3,
    startx: 500, starty: 300,
    weapons: [
      { type: "laser", name: "Pulse Laser", fireRate: 4, projectileDamage: 12 },
      { type: "plasma", name: "Burst Plasma", fireRate: 1.8, projectileDamage: 30 }
    ],
    defaultWeaponType: "laser",
    description: "A versatile assault craft with a good mix of speed, armor, and firepower."
  }, {
    name: "player_glass_cannon", // Striker Model - New
    type: "ship",
    src: "./ships.png", // Placeholder sprite - needs unique coordinates
    sx: 0, sy: 0, sWidth: 300, sHeight: 350, // Example new sprite coords (smaller)
    width: 28, height: 33,
    health: 40, // Very low health
    max_speed: 350,
    thrust: 22, // Very high thrust
    rotationSpeed: Math.PI * 1.7,
    startx: 500, starty: 300,
    weapons: [
      { type: "laser", name: "Focused Beam", fireRate: 2, projectileDamage: 25 }, // High damage laser
      { type: "plasma", name: "Overcharged Plasma", fireRate: 0.8, projectileDamage: 70 } // Slow but very high damage
    ],
    defaultWeaponType: "plasma",
    description: "A high-risk, high-reward striker. Extremely fragile but boasts immense speed and firepower."
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
    ai: this.flankingAI,
    weapons: [
      { type: "laser", name: "Laser Cannon" },
      { type: "plasma", name: "Plasma Blaster" } // Example: different name or stats later
    ],
    defaultWeaponType: "laser"
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
    ai: this.flankingAI, // Can use the same AI or a different one later
    weapons: [
      { type: "laser", name: "Light Laser" },
      { type: "plasma", name: "Compact Plasma" }
    ],
    defaultWeaponType: "laser"
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
    breakInto: { type: "medium_roid", count: 2 } // Large breaks into 2 medium
  }, {
    name: "medium_roid",
    type: "asteroid_medium",
    src: "./roids.png",
    sx: 0, sy: 0, sWidth: 150, sHeight: 150, // Placeholder - adjust to actual sprite sheet
    size: 25,
    health: 50,
    points: 10,
    speed: 75,
    breakInto: { type: "small_roid", count: 2 } // Medium breaks into 2 small
  }, {
    name: "small_roid",
    type: "asteroid_small",
    src: "./roids.png",
    sx: 160, sy: 0, sWidth: 80, sHeight: 80, // Placeholder - adjust to actual sprite sheet
    size: 12,
    health: 25,
    points: 5,
    speed: 100
    // Small ones don't break into anything
  }, {
    name: "enemy_rammer",
    type: "ship",
    src: "./ships.png", // Placeholder, use appropriate sprite
    sx: 0, sy: 520, sWidth: 300, sHeight: 300, // Example sprite coords
    width: 30, height: 30,
    health: 50, // Tougher to survive ramming attempt
    max_speed: 250, // Fast
    speed: 200,
    rotationSpeed: Math.PI * 0.8,
    shootingRange: 150, // Short range, relies on ramming
    startx: 600,
    starty: 50,
    ai: this.kamikazeAI,
    points: 30,
    weapons: [ { type: "laser", name: "Rammer Laser" } ], // Rammer might only have one basic weapon
    defaultWeaponType: "laser"
  }, {
    name: "enemy_sniper",
    type: "ship",
    src: "./ships.png", // Placeholder, use appropriate sprite
    sx: 310, sy: 520, sWidth: 300, sHeight: 300, // Example sprite coords
    width: 35, height: 40,
    health: 30, // More fragile
    max_speed: 120, // Slower, prefers distance
    speed: 80,
    rotationSpeed: Math.PI * 0.5,
    preferredKitingDistance: 500,
    shootingRange: 600, // Long range
    retreatDistance: 300, // If player gets closer than this, it retreats
    startx: 200,
    starty: 50,
    ai: this.kitingAI,
    points: 40,
    weapons: [
      { type: "laser", name: "Sniper Laser" }, // Could have different properties like range/damage
      { type: "plasma", name: "Long-range Plasma" }
    ],
    defaultWeaponType: "laser"
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

  kamikazeAI(aiShip, deltaTime) {
    if (!aiShip.target || !aiShip.target.isActive) {
        aiShip.rotationSpeed = 0; // Stop turning if no target
        // Optionally, make it drift or move randomly
        // aiShip.momentumX *= 0.98; // Slow down
        // aiShip.momentumY *= 0.98;
        return;
    }

    const target = aiShip.target;
    const turnSpeed = aiShip.spriteData.rotationSpeed || Math.PI * 0.8;
    const thrustPower = aiShip.spriteData.speed || 200;
    const shootingRange = aiShip.spriteData.shootingRange || 150;

    const dx = target.x - aiShip.x;
    const dy = target.y - aiShip.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    const angleToTarget = Math.atan2(dy, dx);

    // Turn towards target
    let angleDifference = angleToTarget - aiShip.angle;
    while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
    while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

    aiShip.angle += Math.sign(angleDifference) * Math.min(Math.abs(angleDifference), turnSpeed * deltaTime);

    // Always thrust towards target
    aiShip.momentumX += Math.cos(aiShip.angle) * thrustPower * deltaTime;
    aiShip.momentumY += Math.sin(aiShip.angle) * thrustPower * deltaTime;

    // Shoot if in range and aimed (loosely)
    if (distanceToTarget < shootingRange && Math.abs(angleDifference) < 0.5) { // Wider aiming tolerance
        if (aiShip.currentWeapon && aiShip.currentWeapon.canFire()) {
            aiShip.shoot();
        }
    }
  }

  kitingAI(aiShip, deltaTime) {
    if (!aiShip.target || !aiShip.target.isActive) {
        aiShip.rotationSpeed = 0;
        return;
    }

    const target = aiShip.target;
    const preferredDist = aiShip.spriteData.preferredKitingDistance || 500;
    const retreatDist = aiShip.spriteData.retreatDistance || 300;
    const shootingRange = aiShip.spriteData.shootingRange || 600;
    const turnSpeed = aiShip.spriteData.rotationSpeed || Math.PI * 0.5;
    const thrustPower = aiShip.spriteData.speed || 80;

    const dx = target.x - aiShip.x;
    const dy = target.y - aiShip.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    const angleToTarget = Math.atan2(dy, dx);

    let desiredAngle = angleToTarget;
    let applyThrust = false;

    if (distanceToTarget < retreatDist) { // Player is too close, retreat
        desiredAngle = angleToTarget + Math.PI; // Turn away from player
        applyThrust = true;
    } else if (distanceToTarget > preferredDist) { // Player is too far, move closer
        desiredAngle = angleToTarget; // Turn towards player
        applyThrust = true;
    } else { // Within kiting range, try to strafe or hold position while aiming
        // For simplicity, we'll just aim. More complex strafing could be added.
        desiredAngle = angleToTarget;
        applyThrust = false; // Or minimal thrust to adjust
    }

    // Normalize desiredAngle
    while (desiredAngle > Math.PI) desiredAngle -= 2 * Math.PI;
    while (desiredAngle < -Math.PI) desiredAngle += 2 * Math.PI;

    let angleDifference = desiredAngle - aiShip.angle;
    while (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;
    while (angleDifference < -Math.PI) angleDifference += 2 * Math.PI;

    aiShip.angle += Math.sign(angleDifference) * Math.min(Math.abs(angleDifference), turnSpeed * deltaTime);

    if (applyThrust) {
        aiShip.momentumX += Math.cos(aiShip.angle) * thrustPower * deltaTime;
        aiShip.momentumY += Math.sin(aiShip.angle) * thrustPower * deltaTime;
    }

    // Aim and shoot if in range
    let directAngleToPlayer = Math.atan2(target.y - aiShip.y, target.x - aiShip.x);
    let aimDifference = directAngleToPlayer - aiShip.angle;
    while (aimDifference > Math.PI) aimDifference -= 2 * Math.PI;
    while (aimDifference < -Math.PI) aimDifference += 2 * Math.PI;

    if (distanceToTarget < shootingRange && distanceToTarget > retreatDist * 0.8 && Math.abs(aimDifference) < 0.15) { // Don't shoot if retreating hard
        if (aiShip.currentWeapon && aiShip.currentWeapon.canFire()) {
            aiShip.shoot();
        }
    }
  }
}
