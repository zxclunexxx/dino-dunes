export const PHYSICS = Object.freeze({ gravity:30, jumpVelocity:11.5, playerZ:3, collisionDepth:.66, minSpeed:12, maxSpeed:22 });
export function createRun(random=Math.random){
  const state={distance:0,speed:12,y:0,vy:0,dead:false,passed:0,obstacles:[],nextId:0};
  let z=-29;
  for(let i=0;i<4;i++){state.obstacles.push({id:state.nextId++,z,height:i===0?1.05:1+random()*.5});z-=26+random()*9;}
  return state;
}
export function jump(state){if(state.dead||state.y>.001||state.vy>0)return false;state.vy=PHYSICS.jumpVelocity;return true;}
export function step(state,dt,random=Math.random){
  if(state.dead)return {landed:false,crashed:false,passed:false};
  const wasAirborne=state.y>0; state.y=Math.max(0,state.y+state.vy*dt-.5*PHYSICS.gravity*dt*dt); state.vy=state.y>0?state.vy-PHYSICS.gravity*dt:0;
  state.speed=Math.min(PHYSICS.maxSpeed,PHYSICS.minSpeed+state.distance/100);const move=state.speed*dt;state.distance+=move;
  let passed=false;
  for(const obstacle of state.obstacles){
    const previousZ=obstacle.z;obstacle.z+=move;
    if(previousZ<=PHYSICS.playerZ+PHYSICS.collisionDepth&&obstacle.z>=PHYSICS.playerZ-PHYSICS.collisionDepth&&state.y<obstacle.height-.12){state.dead=true;}
    if(!obstacle.passed&&obstacle.z>PHYSICS.playerZ+PHYSICS.collisionDepth){obstacle.passed=true;state.passed++;passed=true;}
  }
  state.obstacles=state.obstacles.filter(o=>o.z<18);
  while(state.obstacles.length<4){const last=state.obstacles.at(-1);state.obstacles.push({id:state.nextId++,z:(last?.z??-30)-26-random()*9,height:1+random()*.5});}
  return {landed:wasAirborne&&state.y===0,crashed:state.dead,passed};
}
