import * as THREE from './vendor/three.module.js';
import {createDinosaur,createCactus} from './models.js';
import {createRun,jump,step,PHYSICS} from './simulation.js';

const $=id=>document.getElementById(id);
const game=$('game'),world=$('world');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;world.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#edcca8');scene.fog=new THREE.Fog('#edcca8',30,98);
const camera=new THREE.PerspectiveCamera(40,1,.1,180);
const hemi=new THREE.HemisphereLight('#fff2d7','#a38b65',2.6);scene.add(hemi);
const sunlight=new THREE.DirectionalLight('#fff0d3',3.3);sunlight.position.set(-12,22,9);sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);Object.assign(sunlight.shadow.camera,{left:-20,right:20,top:25,bottom:-25,near:1,far:65});sunlight.shadow.normalBias=.035;sunlight.shadow.bias=-.0002;sunlight.target.position.set(0,0,-10);scene.add(sunlight,sunlight.target);
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true});
const sandMat=mat('#ddbc87'),pathMat=mat('#efd29e'),edgeMat=mat('#d3ad76');
function plane(w,h,material,x,z,y=0){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh;}
plane(280,240,sandMat,0,-50,-.045);plane(5.4,180,pathMat,0,-60,-.025);plane(.08,180,edgeMat,-2.74,-60,-.015);plane(.08,180,edgeMat,2.74,-60,-.015);
const sun=new THREE.Mesh(new THREE.SphereGeometry(5,32,16),new THREE.MeshBasicMaterial({color:'#fff0b8',fog:false}));sun.position.set(-24,20,-85);scene.add(sun);
const rockGeo=new THREE.DodecahedronGeometry(1,0),stoneMats=['#bd9671','#c9a17a','#d3af82','#a98663'].map(mat);
const mountainMat=mat('#c39b78');
for(let i=0;i<13;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(6+(i%3)*3,7+(i%4)*3,5),mountainMat);m.position.set(-65+i*11,2,-64-(i%3)*10);m.rotation.y=i*.8;m.scale.z=.65;scene.add(m);}
const mesaMat=mat('#bd8e6b');
for(let i=0;i<5;i++){const mesa=new THREE.Group();const width=4+i%3;const base=new THREE.Mesh(new THREE.CylinderGeometry(width*.75,width,5+i,5),mesaMat);base.position.y=(5+i)/2;mesa.add(base);const top=new THREE.Mesh(new THREE.CylinderGeometry(width*.63,width*.75,.35,5),stoneMats[2]);top.position.y=5+i;mesa.add(top);mesa.position.set(i%2?-20-i*4:20+i*3,0,-29-i*8);scene.add(mesa);}
const decorations=[];
for(let i=0;i<42;i++){
  let mesh;
  if(i%7===0){mesh=createCactus(1.4+(i%3)*.6);}else{mesh=new THREE.Mesh(rockGeo,stoneMats[i%4]);mesh.scale.set(.15+(i%4)*.17,.12+(i%3)*.16,.2+(i%5)*.1);mesh.rotation.set(i*.3,i*.6,0);mesh.castShadow=true;mesh.receiveShadow=true;}
  const side=i%2?1:-1;mesh.position.set(side*(4+(i*7%23)),0,-75+i*2.3);scene.add(mesh);decorations.push(mesh);
}
const trackMarks=[];const markMat=mat('#dabe8d');
for(let i=0;i<35;i++){const mark=new THREE.Mesh(new THREE.BoxGeometry(.08,.015,.28),markMat);mark.position.set(((i*7)%17-8)*.2,.002,-70+i*2.6);mark.rotation.y=i;scene.add(mark);trackMarks.push(mark);}
const dino=createDinosaur();dino.group.position.set(0,0,PHYSICS.playerZ);scene.add(dino.group);
const introCactus=createCactus(1.5);introCactus.position.set(0,0,-9);scene.add(introCactus);
const obstacleMeshes=new Map();const obstaclePool=[];
function syncObstacles(){const ids=new Set(run.obstacles.map(o=>o.id));for(const [id,mesh] of obstacleMeshes){if(!ids.has(id)){scene.remove(mesh);obstaclePool.push(mesh);obstacleMeshes.delete(id);}}for(const obstacle of run.obstacles){let mesh=obstacleMeshes.get(obstacle.id);if(!mesh){mesh=obstaclePool.pop()||createCactus(1);mesh.scale.setScalar(1);scene.add(mesh);obstacleMeshes.set(obstacle.id,mesh);}mesh.scale.y=obstacle.height;mesh.position.set(0,0,obstacle.z);}}
const dustMat=new THREE.MeshBasicMaterial({color:'#f9dfac',transparent:true,opacity:.65});const dustGeo=new THREE.BoxGeometry(.09,.09,.09);
const dust=Array.from({length:24},()=>{const mesh=new THREE.Mesh(dustGeo,dustMat);mesh.visible=false;scene.add(mesh);return {mesh,life:0,vx:0,vy:0};});let dustIndex=0;
function puff(count=4){for(let i=0;i<count;i++){const p=dust[dustIndex++%dust.length];p.life=.35+Math.random()*.2;p.mesh.visible=true;p.mesh.position.set((Math.random()-.5)*.7,.1,3.4+Math.random()*.6);p.vx=(Math.random()-.5)*2;p.vy=.4+Math.random();}}
let run=createRun(),mode='intro',best=0,muted=true,audioContext,previous=performance.now(),worldTime=0,accumulator=0,buffer=0,lastDust=0,deathAt=0,milestone=0;
try{best=Math.max(0,Number(localStorage.getItem('dino-dunes-best'))||0);}catch{}
const padded=value=>String(Math.floor(value)).padStart(5,'0');$('best').textContent=padded(best);
function tone(frequency,duration=.1,type='sine',end=frequency){if(muted)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume().catch(()=>{});const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,audioContext.currentTime);oscillator.frequency.exponentialRampToValueAtTime(end,audioContext.currentTime+duration);gain.gain.setValueAtTime(.055,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+duration);}catch{}}
let toastTimeout;function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),1800);}
function setPlayingUI(){game.classList.add('playing');$('intro').hidden=true;$('dialog').hidden=true;$('pause').hidden=false;$('jump').hidden=false;introCactus.visible=false;}
function start(){for(const mesh of obstacleMeshes.values()){scene.remove(mesh);obstaclePool.push(mesh);}obstacleMeshes.clear();run=createRun();mode='running';accumulator=0;buffer=0;milestone=0;dino.group.rotation.set(0,0,0);dino.group.position.y=0;setPlayingUI();syncObstacles();$('score').textContent='00000';toast('Пробел, ↑ или касание — прыжок');tone(360,.12,'sine',550);}
function attemptJump(){if(mode==='intro'){start();return;}if(mode==='over'){if(performance.now()-deathAt>500)start();return;}if(mode==='paused'){resume();return;}buffer=.1;if(jump(run)){buffer=0;tone(280,.16,'sine',650);puff(4);}}
function finish(){mode='over';deathAt=performance.now();buffer=0;const score=Math.floor(run.distance*3),newBest=score>best;best=Math.max(best,score);try{localStorage.setItem('dino-dunes-best',String(best));}catch{}$('score').textContent=padded(score);$('best').textContent=padded(best);$('final-score').textContent=score;$('final-best').textContent=best;$('dialog-eyebrow').textContent=newBest?'НОВЫЙ ЛИЧНЫЙ РЕКОРД':'ХОРОШИЙ ЗАБЕГ';$('dialog-title').textContent=newBest?'Вот это забег!':'Ещё один прыжок?';$('dialog-copy').textContent=`Кактусов позади: ${run.passed}. В следующий раз — ещё дальше.`;$('resume').innerHTML='Ещё раз <span>↗</span>';$('dialog-hint').textContent='Пробел — новый забег';$('result').hidden=false;$('dialog').hidden=false;$('pause').hidden=true;$('jump').hidden=true;$('resume').focus({preventScroll:true});tone(170,.28,'triangle',65);puff(14);}
function pause(){if(mode!=='running')return;mode='paused';buffer=0;$('dialog-eyebrow').textContent='МОЖНО ВЫДОХНУТЬ';$('dialog-title').textContent='Маленький привал';$('dialog-copy').textContent='Пустыня подождёт. Продолжим, когда будешь готов.';$('result').hidden=true;$('resume').innerHTML='Продолжить <span>→</span>';$('dialog-hint').textContent='Пробел или P — продолжить';$('dialog').hidden=false;$('jump').hidden=true;$('resume').focus({preventScroll:true});}
function resume(){if(mode!=='paused')return;mode='running';accumulator=0;buffer=0;previous=performance.now();$('dialog').hidden=true;$('jump').hidden=false;$('resume').blur();}
$('start').addEventListener('click',start);$('resume').addEventListener('click',()=>mode==='paused'?resume():start());$('pause').addEventListener('click',()=>mode==='running'?pause():resume());
$('sound').addEventListener('click',()=>{muted=!muted;$('sound').setAttribute('aria-pressed',String(!muted));$('sound').setAttribute('aria-label',muted?'Включить звук':'Выключить звук');$('sound-mark').setAttribute('d',muted?'m16 9 6 6m0-6-6 6':'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14');if(!muted)tone(520,.1);});
window.addEventListener('keydown',event=>{if(['Space','ArrowUp','KeyW','KeyP','Escape'].includes(event.code)){if(event.code==='Space'&&event.target instanceof HTMLButtonElement&&!['start','resume','jump'].includes(event.target.id))return;event.preventDefault();if(event.repeat)return;if(event.code==='KeyP'||event.code==='Escape'){if(mode==='running')pause();else if(mode==='paused')resume();}else{attemptJump();}}});
game.addEventListener('pointerdown',event=>{if(event.target.closest('button,a')||event.target.closest('#dialog')||event.target.closest('#error'))return;if(mode==='running'){event.preventDefault();attemptJump();}});
$('jump').addEventListener('pointerdown',event=>{event.preventDefault();attemptJump();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();previous=performance.now();});window.addEventListener('blur',pause);
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();$('error').hidden=false;});
const cameraLook=new THREE.Vector3(-8,1,-2),targetLook=new THREE.Vector3();
function resize(){const w=world.clientWidth,h=world.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(mode==='intro')cameraLook.set(camera.aspect<.8?-3.8:-8,camera.aspect<.8?2.2:1,-2);}
new ResizeObserver(resize).observe(world);resize();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;const mobile=camera.aspect<.8;
  if(mode==='running'){
    accumulator+=dt;while(accumulator>=1/120&&mode==='running'){const event=step(run,1/120);buffer=Math.max(0,buffer-1/120);if(event.landed){puff(5);if(buffer>0&&jump(run)){buffer=0;tone(280,.16,'sine',650);}}if(event.crashed)finish();accumulator-=1/120;}
    syncObstacles();dino.group.position.y=run.y;$('score').textContent=padded(run.distance*3);const nextMilestone=Math.floor(run.distance*3/500);if(nextMilestone>milestone){milestone=nextMilestone;toast(`${milestone*500} очков. Так держать!`);tone(650,.18,'sine',950);}
    if(!run.y&&now-lastDust>90){puff(1);lastDust=now;}
  }
  const moving=mode==='running',motion=moving?run.speed*dt:mode==='intro'?dt*1.3:0;
  if(mode!=='paused')worldTime+=dt;
  for(const mesh of decorations){mesh.position.z+=motion;if(mesh.position.z>20)mesh.position.z-=104;}
  for(const mesh of trackMarks){mesh.position.z+=motion;if(mesh.position.z>20)mesh.position.z-=91;}
  for(const p of dust){if(p.life>0&&mode!=='paused'){p.life-=dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=dt*3;p.mesh.scale.setScalar(Math.max(0,p.life*2));if(p.life<=0)p.mesh.visible=false;}}
  if(mode!=='paused')dino.animate(worldTime,moving?run.speed:mode==='intro'?1.5:0,run.y>0,mode==='over');
  if(mode==='over')dino.group.rotation.z=THREE.MathUtils.lerp(dino.group.rotation.z,-.28,dt*8);
  const intro=mode==='intro';targetLook.set(intro?(mobile?-3.8:-8):(mobile?-1.2:0),intro?(mobile?2.2:1):1,intro?-2:(mobile?-5:-6));cameraLook.lerp(targetLook,1-Math.exp(-dt*3));camera.position.set(mobile?(intro?8:4.5):9,mobile?7:6,mobile?18:14);camera.lookAt(cameraLook);
  renderer.render(scene,camera);
}
$('start').disabled=false;$('start').innerHTML='Начать приключение <span>↗</span>';requestAnimationFrame(frame);
