var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var pix_width = canvas.width;
var pix_height = canvas.height;
var pix_width_center = canvas.width/2;
var pix_height_center = canvas.height/2;
var mouseX=pix_width_center;
var mouseY=pix_height_center;

var mm2pix = 10;
var sphereSegs = 200;
var RayTraceIterations=10;
var minRayMag = 0.05;
var raf;

//Array that contains all the optical pieces in the scene
var optic = [];
//Array that contains all the initial ray sources
var rays = [];

var RayIter = new Array(RayTraceIterations+1);


function rayTrace(){
	var minDistance = 1e30;
	var minRet;
	var raysNew = [];

	RayIter[0] = rays;
	//Go through all the rays and check for intersections with 
	for(var i=0; i<RayTraceIterations; i=i+1){
		for(var j=0; j<RayIter[i].length; j=j+1){
			for(var k=0; k<optic.length; k=k+1){
				var ret = optic[k].RayIntersect(RayIter[i][j]);
				if(ret.dist < minDistance){
					minDistance = ret.dist;
					RayIter[i][j].intersect=minDistance;
					RayIter[i][j].optic=optic[k]; //For absorb/reflect/transmit info
					minRet = ret;
				}
			}
			if(minDistance < 1e30){
				var n1 = RayIter[i][j].index;
				var n2 = RayIter[i][j].optic.index;
				
				if(n1 == n2){
					n2 = 1;
				}

				var alpha = RayIter[i][j].rot;
				var beta = -1*minRet.segment.verticalAngle();
				console.log('alpha, beta before');
				console.log(alpha, beta);
				//if(alpha > Math.PI/2) { alpha = alpha - Math.PI; }
				//if(alpha < -Math.PI/2) { alpha = alpha + Math.PI; }
				
				if(beta > Math.PI/2) { beta = beta - Math.PI; }
				if(beta < -Math.PI/2) { beta = beta + Math.PI; }
				
				var q1 = alpha-beta;
				var q2_crit = n1/n2*Math.sin(q1);
				var q2 = Math.asin(n1/n2*Math.sin(q1));
				
				if(q1 > Math.PI/2 || q1 < -Math.PI/2) 
				{ 
					q2 = q2 - Math.PI; 
					var nu = (beta-q2);
				}
				else{
					var nu = (q2+beta);
				}
				//if(q1 < -Math.PI/2) { q2 = q2 + Math.PI; }
				
				
				
				
				
				//if(nu < -2*Math.PI) { nu = nu + 2*PI; } 
				//if(nu > 2*Math.PI) { nu = nu - 2*PI; }
				
				console.log('alpha, beta, n1, n2');
				console.log(alpha, beta, n1, n2);
				console.log('q2_crit, q1, q2, nu');
				console.log(q2_crit, q1, q2, nu);
				
				//Reflection and refraction 
				if(Math.abs(q2_crit) < 1.0){
					var rayReflectMag = (RayIter[i][j].mag * (1-RayIter[i][j].optic.absorb))*RayIter[i][j].optic.reflect;
					var rayTransmitMag = (RayIter[i][j].mag * (1-RayIter[i][j].optic.absorb))*(1-RayIter[i][j].optic.reflect);
					//If the magnitude is > 5%, make a new ray
					if(rayReflectMag > minRayMag) {
						var ray = new Ray(	RayIter[i][j].vec.x*RayIter[i][j].intersect+RayIter[i][j].pt.x, 
											RayIter[i][j].vec.y*RayIter[i][j].intersect+RayIter[i][j].pt.y,
											2*minRet.segment.angle()-RayIter[i][j].rot, rayReflectMag, 'white', raysNew, RayIter[i][j]);
					}
					if(rayTransmitMag > minRayMag) {
						var ray = new Ray(	RayIter[i][j].vec.x*RayIter[i][j].intersect+RayIter[i][j].pt.x, 
											RayIter[i][j].vec.y*RayIter[i][j].intersect+RayIter[i][j].pt.y,
											nu, rayTransmitMag, 'white', raysNew, RayIter[i][j], n2);
					}
				}
				else{	
					//Critical angle too large, pure reflection
					console.log('Pure reflection')
					var ray = new Ray(	RayIter[i][j].vec.x*RayIter[i][j].intersect+RayIter[i][j].pt.x, 
											RayIter[i][j].vec.y*RayIter[i][j].intersect+RayIter[i][j].pt.y,
											2*minRet.segment.angle()-RayIter[i][j].rot, RayIter[i][j].mag*(1-RayIter[i][j].optic.absorb), 'white', raysNew, RayIter[i][j]);
				}
			
			}
			else{
				RayIter[i][j].intersect=1e30;
			}
			minDistance = 1e30;
		}
		RayIter[i+1] = raysNew;
		raysNew = [];
		console.log('Processed Rays');
		console.log(RayIter[i].length);
		console.log(RayIter[i]);
		console.log('Next Rays');
		console.log(RayIter[i+1].length);
		console.log(RayIter);
	}
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
//Convert values to color
function rgb(r, g, b){
  r = Math.floor(r);
  g = Math.floor(g);
  b = Math.floor(b);
  return ["rgb(",r,",",g,",",b,")"].join("");
}
//Create a vector that points from point1 to point2
function pts2vec(pt1, pt2){
	var vec = new Victor((pt2.x-pt1.x),(pt2.y-pt1.y));
	return vec;
}
//Check for intersection, return  
function RayIntersect(pt1, vecR, ray) {
	var vecP = new Victor(pt1.x, pt1.y);
	var vecQ = new Victor(ray.pt.x, ray.pt.y);
	
	//Vector S from notes is ray vector
	var crossRS = vecR.cross(ray.vec);
	
//	console.log(vecP)
//	console.log(vecR)
//	console.log(vecQ)
//	console.log(ray.vec)
	//The lines are parallel if RxS == 0
	if(crossRS == 0) {
		return false;
	}
	
	vecQ.subtract(vecP);
	var subQPCrossS = vecQ.cross(ray.vec);
	
	var T = subQPCrossS/crossRS;
//	console.log(T)
	//Intersection takes place outside of segment
	if( T < 0 || T > 1 ) {
		return false;
	}
	
	var subQPCrossR = vecQ.cross(vecR);
	var U = subQPCrossR/crossRS;
//	console.log('Ray Length (U)');
//	console.log(U);
	
	if(U >= 0){
		//Return parameterized value of where along ray intersection takes place
		return U;
	}
	else{
		return false;
	}	
}

function drawCoordinate() {
	ctx.beginPath();
	ctx.strokeStyle=rgb(100,100,100);
	ctx.moveTo(0,pix_height_center);
	ctx.lineTo(pix_width,pix_height_center);
	ctx.stroke();
	ctx.moveTo(pix_width_center,0);
	ctx.lineTo(pix_width_center,pix_height);
	ctx.stroke();
}

function clear() {
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
}
//Draw the scene
function draw(){
	rayTrace();
	clear();
	drawCoordinate()
	for(var i=0; i<optic.length; i++){
		optic[i].draw();
	}
	for(i=0; i<RayTraceIterations; i++){
		for(var j=0; j<RayIter[i].length; j=j+1){
			RayIter[i][j].draw();
		}
	}
	 
	raf = window.requestAnimationFrame(draw);
	 // sleep(10);

}
class Point {
	constructor(x,y){
		this.x = x;
		this.y = y;
	}
}


class Ray{
	constructor(x,y,rot, mag, wavelength, array, rayParent=null, index=1){
		this.pt = new Point(x,y);
		this.rot = rot;
		this.vec = new Victor(Math.cos(rot),Math.sin(rot));
		this.wavelength = wavelength;
		this.mag = mag;
		this.index = index;
		//Related to intersection
		this.intersect = 1e30;
		this.optic = null;
		this.rayParent=rayParent;
		//Array to push this new object into 
		array.push(this);
	}
	
	draw(){
		if(this.rayParent == null){
			ctx.strokeStyle="#000000";
			ctx.fillStyle="#000000";
			ctx.beginPath();
			ctx.arc((this.pt.x*mm2pix)+pix_width_center, (-this.pt.y*mm2pix)+pix_height_center, 0.25*mm2pix, 0, Math.PI * 2, true);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
		
		ctx.strokeStyle=rgb(255,(1-this.mag)*255,(1-this.mag)*255);
		if(this.intersect == 1e30){
			
			ctx.beginPath();
			ctx.moveTo((this.pt.x*mm2pix)+pix_width_center,(-this.pt.y*mm2pix)+pix_height_center);
			ctx.lineTo(((this.pt.x+this.vec.x*1000)*mm2pix)+pix_width_center,(-(this.pt.y+this.vec.y*1000)*mm2pix)+pix_height_center);
			ctx.stroke();
		}
		else{
			ctx.beginPath();
			ctx.moveTo((this.pt.x*mm2pix)+pix_width_center,(-this.pt.y*mm2pix)+pix_height_center);
			ctx.lineTo(((this.pt.x+this.vec.x*this.intersect)*mm2pix)+pix_width_center,(-(this.pt.y+this.vec.y*this.intersect)*mm2pix)+pix_height_center);
			ctx.stroke();
			
		}
	}
}

class OpticSphere{
	constructor(x, y, radius, height, rot, index, reflect, absorb){
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.rot = rot;
		this.seg = sphereSegs;
		this.color = 'blue';
		
		//New ray generation info
		this.index = index;
		//What % is reflected (1-reflect) = transmitted 
		this.reflect = reflect;
		//What % of the ray is absorbed, simply lost
		this.absorb = absorb;
		//New ray reflect amplitude = (ray.amp*(1-absorb))*reflect
		//New ray transmitted amplitude = (ray.amp*(1-absorb))*(1-reflect)

		
		if(2*radius < height) {
			this.height = 2*radius;
		}
		else{
			this.height = height;
		}
		
		this.q_start = -Math.asin(this.height/2/radius) + rot;
		this.q_end = Math.asin(this.height/2/radius) + rot;
		
		var dq = (this.q_start - this.q_end)/this.seg;
		this.pts=[];

		//Bounding box for optic
		this.ymin=1e30;
		this.ymax=-1e30;
		this.xmin=1e30;
		this.xmax=-1e30;
		
		for(var i=0; i<=this.seg; i=i+1){
			this.pts[i] = new Point(radius*Math.cos(i*dq-this.q_start)+this.x, radius*Math.sin(i*dq-this.q_start)+this.y);
			if(this.pts[i].x < this.xmin) {
				this.xmin = this.pts[i].x;
			}
			if(this.pts[i].x > this.xmax) {
				this.xmax = this.pts[i].x;
			}
			if(this.pts[i].y < this.ymin) {
				this.ymin = this.pts[i].y;
			}
			if(this.pts[i].y > this.ymax) {
				this.ymax = this.pts[i].y;
			}
		}
		optic.push(this)
	}
	
	draw(){
		ctx.strokeStyle = rgb(0,0,0);
		ctx.beginPath();
		ctx.arc((this.x*mm2pix)+pix_width_center, (this.y*mm2pix)+pix_height_center, this.radius*mm2pix, this.q_end, this.q_start, true);
		ctx.lineStyle = this.color;
		ctx.stroke();
		
	}

	RayIntersect(ray){
		var ret;
		var minRetVec = new Victor(1e30, 1e30);

		ret = this.RayIntersectBound(ray);
		if(ret != 1e30){
			ret = this.RayIntersectSegments(ray);
			return ret;
		}
		else {
			return {
				dist: ret,
				segment: minRetVec
			}
		}
	}
	
	RayIntersectSegments(ray){
		var ret;
		var minRet = 1e30;
		//Closest to ray, we'll return the vector it intersected with
		var minRetVec = new Victor(1e30, 1e30);
		
		for(var i=0; i<this.seg; i=i+1){
			ret = RayIntersect(this.pts[i], pts2vec(this.pts[i], this.pts[i+1]), ray);
			if(ret != false){
				if(ret < minRet && ret > 1e-10){
					minRet = ret;
					minRetVec = pts2vec(this.pts[i], this.pts[i+1]);
				}
			}
		}

		return {
			dist: minRet,
			segment: minRetVec
		}
	}
	RayIntersectBound(ray){
		var ret;
		var minRet = 1e30;
		var pts = [];
		pts[0] = new Point(this.xmin, this.ymin);
		pts[1] = new Point(this.xmax, this.ymin);
		pts[2] = new Point(this.xmax, this.ymax);
		pts[3] = new Point(this.xmin, this.ymax);
		
		for(var i=0; i<=3; i=i+1){
			ret = RayIntersect(pts[i], pts2vec(pts[i], pts[(i+1)%4]), ray);
			if(ret != false){
				if(ret < minRet){
					minRet = ret;
				}
			}
		}
		return minRet;
	}
}

class OpticFlat{
	constructor(x, y, length, width, rot, index, reflect, absorb){
		this.x=x;
		this.y=y;
		this.length=length;
		this.width=width;
		this.rot=rot;
		
		//Related to new rays genereated
		this.index=index;
		//What % is reflected (1-reflect) = transmitted 
		this.reflect = reflect;
		//What % of the ray is absorbed, simply lost
		this.absorb = absorb;
		//New ray reflect amplitude = (ray.amp*(1-absorb))*reflect
		//New ray transmitted amplitude = (ray.amp*(1-absorb))*(1-reflect)
		
		this.pts=[];
		
		var vec = new Victor((-width/2),(-length/2))
		vec.rotate(rot);
		this.pts[0] = new Point(vec.x+x, vec.y+y);
		vec = new Victor((width/2),(-length/2))
		vec.rotate(rot);
		this.pts[1] = new Point(vec.x+x, vec.y+y);
		vec = new Victor((width/2),(length/2))
		vec.rotate(rot);
		this.pts[2] = new Point(vec.x+x, vec.y+y);
		vec = new Victor((-width/2),(length/2))
		vec.rotate(rot);
		this.pts[3] = new Point(vec.x+x, vec.y+y);
		
		optic.push(this)
	}
	
	draw(){
		for(var i=0; i<=3; i=i+1){
			ctx.moveTo((this.pts[i].x*mm2pix)+pix_width_center,(-this.pts[i].y*mm2pix)+pix_height_center);
			ctx.lineTo((this.pts[(i+1)%4].x*mm2pix)+pix_width_center,(-this.pts[(i+1)%4].y*mm2pix)+pix_height_center);
			ctx.stroke();		
		}
		//ctx.moveTo((this.pts[3].x*mm2pix)+pix_width/2,(-this.pts[3].y*mm2pix)+pix_height/2);
		//ctx.lineTo((this.pts[0].x*mm2pix)+pix_width/2,(-this.pts[0].y*mm2pix)+pix_height/2);
		//ctx.stroke();
	}
	
	RayIntersect(ray){
		var ret;
		var minRet = 1e30;
		var minRetVec = new Victor(1e30, 1e30);
		
		for(var i=0; i<=3; i=i+1){
			ret = RayIntersect(this.pts[i], pts2vec(this.pts[i], this.pts[(i+1)%4]), ray);
			if(ret != false){
				
				if(ret < minRet && ret > 1e-10){
					minRet = ret;
					minRetVec = pts2vec(this.pts[i], this.pts[(i+1)%4]);
				}
			}
		}

		return {
			dist: minRet,
			segment: minRetVec
		}
	}
}



//							   x  y   r   h   q  N  ref  abs 
//var mirror = new OpticSphere(-70, 0, 100, 10, 0, 1.5, 1.0, 0.1);
var mirror1 = new OpticSphere( 18, 0, 20, 15, Math.PI, 1.5, 0, 0.1);
var mirror2 = new OpticSphere(-18, 0, 20, 15,       0, 1.5, 0, 0.1);

var mirror3 = new OpticSphere(0, 0, 20, 15, 0, 1.5, 1, 0.5);

//						   x   y  h  w     q          N  ref  abs
var fold2 = new OpticFlat(18, 0, 4, 0.01, 0 , 1, 1, 0);
//	      			       x   y  h  w     q    N  ref  abs
var fold3 = new OpticFlat(-20, 0, 20, 0.1,  Math.PI/4, 1, 0.5, 0);


var ray = new Ray(-25, 5, 0, 1,'white', rays);
var ray = new Ray(-25, 2.5, 0, 1, 'white', rays);
var ray = new Ray(-25, 0, 0, 1, 'white', rays);
var ray = new Ray(-25, -2.5, 0, 1, 'white', rays);
var ray = new Ray(-25, -5, 0, 1, 'white', rays);





window.addEventListener('keydown', function(e) {
	if (e.defaultPrevented) { 
	return; // Do nothing if the event was already processed
	}
  
	console.log(e.key);
	switch (e.key) {
		case "a":
			mm2pix = mm2pix*1.2;
			pix_width_center -= (mouseX-pix_width/2);
			pix_height_center -= (mouseY-pix_height/2);
		break;
		case "z":
			mm2pix = mm2pix/1.2;
			pix_width_center -= (mouseX-pix_width/2);
			pix_height_center -= (mouseY-pix_height/2);
		break;
		case "s":
			mm2pix = 10;
			pix_width_center = pix_width/2;
			pix_height_center = pix_height/2;
		break;
	}


	
	// Cancel the default action to avoid it being handled twice
	e.preventDefault();
}, true);

canvas.addEventListener('mousemove', function(e) {
	for(var i=0; i<5; i++){
		rays[i].pt.x = (e.clientX-pix_width_center)/mm2pix;
		
	}
	rays[0].pt.y = -(e.clientY-pix_height_center)/mm2pix-5;
	rays[1].pt.y = -(e.clientY-pix_height_center)/mm2pix-2.5;
	rays[2].pt.y = -(e.clientY-pix_height_center)/mm2pix;
	rays[3].pt.y = -(e.clientY-pix_height_center)/mm2pix+2.5;
	rays[4].pt.y = -(e.clientY-pix_height_center)/mm2pix+5;
	mouseX = e.clientX;
	mouseY = e.clientY;
	console.log(mouseX);
	console.log(mouseY);
});

canvas.addEventListener('mouseout', function(e) {
  //window.cancelAnimationFrame(raf);
  //running = false;
});

//var ray = new Ray(-10, 10, -Math.PI/2, 1, 'white', rays);



draw();
//var ret = fold.RayIntersect(ray);
//console.log(ret.segment.horizontalAngleDeg())
//ray.intersect = ret.dist;
//console.log(ray);

//var ray2 = new Ray(ray.vec.x*ret.dist+ray.pt.x, ray.vec.y*ret.dist+ray.pt.y, 2*ret.segment.angle()-ray.rot, 'white');
//console.log(ray2)
//ray2.intersect = mirror.RayIntersectSegments(ray2).dist;
//console.log(ray2);


//mirror.draw()
//fold.draw()
//ray.draw()
//ray2.draw()


console.log(optic)