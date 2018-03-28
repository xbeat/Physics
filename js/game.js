
class Game3D{

	constructor(){

		// events
		window.addEventListener( 'resize', 	function() {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize( window.innerWidth, window.innerHeight );
		}.bind( this ), false );
		
		window.addEventListener( 'mousemove', this.rayTest.bind( this ), false );

		this.content;
		let aspect = window.innerWidth / window.innerHeight;
		let radius = 60;
		this.mouse = new THREE.Vector2();

		this.camera = new THREE.PerspectiveCamera( 45, aspect, 1, 20000 );
		this.camera.position.set( 0.0, radius * 6, radius * 6.5 );

		this.rayCaster = new THREE.Raycaster();
		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.renderer.domElement );

		let controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		controls.target.set( 0, 20, 0 );

		let ctx = this.renderer.context;
		ctx.getShaderInfoLog = function () { return '' };
		       
		//Light
		this.scene.add( new THREE.AmbientLight( 0xffffff ) );
		let lightOffset = new THREE.Vector3( 0, 1000, 1000.0 ); 
		let light = new THREE.DirectionalLight( 0x333333, 1.5 );
		this.scene.add( light );

		//let helper = new THREE.CameraHelper( light.shadow.camera );
		//scene.add( helper );

		// physics
		this.world = new OIMO.World( { info:false, worldscale:100 } );
		this.world.gravity = new OIMO.Vec3( 0, -9.8, 0 );

		// The Bit of a collision group
		let group1 = 1 << 0;  // 00000000 00000000 00000000 00000001
		let group2 = 1 << 1;  // 00000000 00000000 00000000 00000010
		let group3 = 1 << 2;  // 00000000 00000000 00000000 00000100
		let all = 0xffffffff; // 11111111 11111111 11111111 11111111

		// All the physics setting for rigidbody
		this.config = [
		    1, // The density of the shape.
		    0.4, // The coefficient of friction of the shape.
		    0.2, // The coefficient of restitution of the shape.
		    1, // The bits of the collision groups to which the shape belongs.
		    all // The bits of the collision groups with which the shape collides.
		];

		// -------- Pitch ---------   
		new THREE.ObjectLoader().load( "models/pitch/stadium.json", function( pitch ) {
		    
		    // Pitch Base look in the plus          
		    //materials[0].side = THREE.DoubleSide;                 
		    //let ground =  new THREE.Mesh( geometry, materials[0] );
		    //ground.scale.set( 20, 20, 20 );
		    //ground.receiveShadow = true;
		    //scope.scene.add( ground );

		    pitch.position.set( -50, -30, -100 );
		    pitch.scale.set( 800, 800, 800 );

		    this.content = new THREE.Object3D();
		    this.content.add( pitch );
		    this.scene.add( this.content ); 

		}.bind( this ));

		//add ground
		let ground = this.world.add( { size:[ 6000, 40, 5000 ], pos:[ 0, -20, 0 ], config: this.config } );

		// ball mesh
		let x = 0;
		let z = 0;
		let y = 100;
		let w = 10;
		let h = 10;
		let d = 10;

		let buffgeoSphere = new THREE.BufferGeometry();
		buffgeoSphere.fromGeometry( new THREE.SphereGeometry( 1, 20, 10 ) );

		let textureBall = new THREE.TextureLoader().load( 'images/ball.png' );                    
		let materialBall = new THREE.MeshBasicMaterial( { color: 0xffffff, map: textureBall } );

		this.ball3D = new THREE.Mesh( buffgeoSphere, materialBall );
		this.ball3D.scale.set( w, w, w );
		this.ball3D.castShadow = true;
		this.ball3D.receiveShadow = true;
		this.scene.add( this.ball3D );                

		//ball body
		this.config[3] = group2;
		this.config[4] = all;
		this.ball3DBody = this.world.add( { type:'sphere', size:[ w ], pos:[ x, y, z ], move:true, config: this.config, name:'sphere' } );

		// paddle raycaster
		this.vPaddle = new THREE.Object3D();

		// paddle mesh
		this.matBoxHit = new THREE.MeshBasicMaterial( { color: 0x383838 } );
		this.matBox = new THREE.MeshBasicMaterial( { color: 0x58AA80 } );
		let buffgeoBox = new THREE.BufferGeometry();
		buffgeoBox.fromGeometry( new THREE.BoxGeometry( 1, 1, 1 ) );

		this.paddle = new THREE.Mesh( buffgeoBox, this.matBox );
		this.paddle.scale.set( 20, 40, 60 );
		this.scene.add( this.paddle );

		// paddle body
		this.config[3] = 1;
		this.config[4] = all;
		this.paddleBody = this.world.add( { size:[ 20, 40, 60 ], pos:[ -150, 20, 0 ], rot:[ 0, 0, 0 ], move:true, noSleep:true, config: this.config, name:'paddle', kinematic:true } );

		this.addWalls();
		this.render();


			let center = new THREE.Vector3();
            let force = this.ball3D.position.clone().negate().normalize().multiplyScalar(0.1);
            this.ball3DBody.applyImpulse( center, force );

	};

	render() {

		const render = this.render.bind( this ); 
	    requestAnimationFrame( render );
	    this.renderer.render( this.scene, this.camera );

	    this.world.step();

	    // apply new position on last rigidbody
	    this.paddleBody.setPosition( this.vPaddle.position );

	    this.vPaddle.lookAt( new THREE.Vector3( 100, this.vPaddle.position.y, 0 ) );
	    this.vPaddle.rotation.y += Math.PI/2;

	    // apply new rotation on last rigidbody
	    this.paddleBody.setQuaternion( this.vPaddle.quaternion );        

	    this.ball3D.position.copy( this.ball3DBody.getPosition() );
	    this.ball3D.quaternion.copy( this.ball3DBody.getQuaternion() );

	    this.paddle.position.copy( this.paddleBody.getPosition() );
	    this.paddle.quaternion.copy( this.paddleBody.getQuaternion() );

	    // reset position
	    if( this.ball3D.position.y < -100 ){
	        let x = 0;
	        let z = 0;
	        let y = 100 + Math.random() * 100;
	        this.ball3DBody.resetPosition( x, y, z );
	    };

	    // contact test
	    if( this.world.checkContact( 'paddle', 'sphere' ) ) {
	        this.paddle.material = this.matBox;
	    } else {
	        this.paddle.material = this.matBoxHit;
	    };

	};

	//----------------------------------
	//  RAY TEST
	//----------------------------------
	rayTest( e ) {

	    this.mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	    this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

	    this.rayCaster.setFromCamera( this.mouse, this.camera );
	    let intersects = this.rayCaster.intersectObjects( this.content.children, true );

	    if ( intersects.length ) {
	        this.vPaddle.position.copy( intersects[ 0 ].point.add( new THREE.Vector3( 0, 20, 0 ) ) );
	    };

	};

	addWalls(){

		// add walls
		let walls = new Array();
		let wallsBody = new Array();
		let matWall = new THREE.MeshBasicMaterial( { color: 0x004400 } );
		let buffgeoWall = new THREE.BufferGeometry();

		let wallLeft = { x: 0, y: 15, z: -1950, w: 6000, h: 150, d: 10 };
		let wallRight = { x: 0, y: 15, z: 1950, w: 6000, h: 150, d: 10 };
		let wallTop = { x: -3000, y: 15, z: 0, w: 10, h: 150, d: 3900 };
		let wallBottom = { x: 3000, y: 15, z: 0, w: 10, h: 150, d: 3900 };

		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallLeft.w, wallLeft.h, wallLeft.d ), matWall ) );
		this.scene.add( walls[0] );

		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallRight.w, wallRight.h, wallRight.d ), matWall ) );
		this.scene.add( walls[1] );

		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallTop.w, wallTop.h, wallTop.d ), matWall ) );
		this.scene.add( walls[2] );

		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallBottom.w, wallBottom.h, wallBottom.d ), matWall ) );
		this.scene.add( walls[3] );

		wallsBody.push( this.world.add( { size:[ wallLeft.w, wallLeft.h, wallLeft.d ], pos:[ wallLeft.x, wallLeft.y, wallLeft.z ], move:false, config: this.config, name:'wallLeft' } ) );
		walls[0].position.copy( wallsBody[0].getPosition() );
		walls[0].quaternion.copy( wallsBody[0].getQuaternion() );

		wallsBody.push( this.world.add( { size:[ wallRight.w, wallRight.h, wallRight.d ], pos:[ wallRight.x, wallRight.y, wallRight.z ], move:false, config: this.config, name:'wallright' } ) );
		walls[1].position.copy( wallsBody[1].getPosition() );
		walls[1].quaternion.copy( wallsBody[1].getQuaternion() );

		wallsBody.push( this.world.add( { size:[ wallTop.w, wallTop.h, wallTop.d ], pos:[ wallTop.x, wallTop.y, wallTop.z ], move:false, config: this.config, name:'wallTop' } ) );
		walls[2].position.copy( wallsBody[2].getPosition() );
		walls[2].quaternion.copy( wallsBody[2].getQuaternion() );

		wallsBody.push( this.world.add( { size:[ wallBottom.w, wallBottom.h, wallBottom.d ], pos:[ wallBottom.x, wallBottom.y, wallBottom.z ], move:false, config: this.config, name:'wallBottom' } ) );
		walls[3].position.copy( wallsBody[3].getPosition() );
		walls[3].quaternion.copy( wallsBody[3].getQuaternion() );

	};

};

//let game3D = new Game3D();




'use strict';

class KickBall{

	constructor() {

		this.state = {
		    phase: "loading",
		    score: 0
		};

		this.origin = new THREE.Vector3( 0, 15, 0 );
		this.isIntersected = false;
		this.shotDir = new THREE.Vector3( 0, 0, 1 );
		this.goalDir = new THREE.Vector3( 0, 0, 1 );
		this.shotPow = 0;
		this.ballSize = 5;
		this.lastTime = performance.now();

        this.cylinderBodies = new Array();
        this.cylinderMeshes = new Array();

		this.mouseClick = {
		    x: 0,
		    y: 0,
		    is: false,
		    setPos: function ( e, t ) {
		        this.x = e;
		        this.y = t
		    }
		};

		this.mouseDrag = {
		    x: 0,
		    y: 0,
		    is: false,
		    setPos: function ( e, t ) {
		        this.x = e;
		        this.y = t
		    }
		};

	    this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	    this.renderer.setSize( window.innerWidth, window.innerHeight );

	    this.container = document.getElementById( "gameWrap" );
	    this.container.appendChild( this.renderer.domElement );

	    this.camera = new THREE.PerspectiveCamera( 30, window.innerWidth / window.innerHeight, 1, 20000 );

		//controls
		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.rotateSpeed = 0.4;
		this.controls.zoomSpeed = 0.4;
		this.controls.panSpeed = 0.4;
		    

		let aspect = window.innerWidth / window.innerHeight;
		let radius = 60;

		this.camera = new THREE.PerspectiveCamera( 45, aspect, 1, 20000 );
		this.camera.position.set( 0.0, radius * 6, radius * 6.5 );

		this.controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		this.controls.target.set( 0, radius, 0 );
		this.controls.enabled = true;

	   	this.raycaster = new THREE.Raycaster;

		let ctx = this.renderer.context;
		ctx.getShaderInfoLog = function () { return '' };
	    
	    this.scene = new THREE.Scene;
  	    
		//Lights
		this.scene.add( new THREE.AmbientLight( 0xffffff ) );

		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

		this.lightOffset = new THREE.Vector3( 0, 1000, 1000.0 ); 
		this.light = new THREE.DirectionalLight( 0x888888, 1 );
		this.light.position.copy( this.lightOffset );
		this.light.castShadow = true;
		this.light.shadow.mapSize.width = 2048;
		this.light.shadow.mapSize.height = 2048;
		this.light.shadow.camera.near = 10;
		this.light.shadow.camera.far = 10000;
		this.light.shadow.bias = 0.00001;
		this.light.shadow.camera.right = 3200;
		this.light.shadow.camera.left = -3400;
		this.light.shadow.camera.top = 1500;
		this.light.shadow.camera.bottom = -2500;
		this.scene.add( this.light );
  
		// Dat Gui 
		this.shotControl = {
		    forceX: 0, // left right
		    forceY: 900, // up down
		    forceZ: -900, // forward backward
		    originX: -1.22570099936076236, //spin x
		    originY: -0.550141484066893546, // spin y
		    shoot: this.kickBall.bind( this )
		};

		let gui = new dat.GUI( { autoPlace: false } );
		document.getElementById( "container" ).appendChild( gui.domElement );
		gui.add( this.shotControl, 'forceX', -3200, 3200 );
		gui.add( this.shotControl, 'forceY', -900, 900 );
		gui.add( this.shotControl, 'forceZ', -3200, 3200 );
		gui.add( this.shotControl, 'originX', -0.55, 0.55 );
		gui.add( this.shotControl, 'originY', -0.55, 0.55 );
		gui.add( this.shotControl, 'shoot' );

	    //objects
	    let materialWhite = new THREE.MeshLambertMaterial( { color: 16777215 } );    
	    let materialBlack = new THREE.MeshLambertMaterial( { color: 0 } );
	    
	    let postShape = new THREE.CubeGeometry( .12, 2.56, .12 );
	    let postLeft = new THREE.Mesh( postShape, materialWhite );
	    postLeft.position.set( 3.72, 1.28, 48 );
	    this.scene.add( postLeft );
	    
	    let postRight = new THREE.Mesh( postShape, materialWhite );
	    postRight.position.set( -3.72, 1.28, 48 );
	    this.scene.add( postRight );
	    
	    let crossbarShape = new THREE.CubeGeometry( 7.44, .12, .12 );
	    let crossbar = new THREE.Mesh( crossbarShape, materialWhite );
	    crossbar.position.set( 0, 2.5, 48 );
	    this.scene.add( crossbar );
	
		// init OIMO
		this.world = new OIMO.World( { info:false, worldscale:100 } );
		this.world.gravity = new OIMO.Vec3( 0, -9.8, 0 );

		// The Bit of a collision group
		let group1 = 1 << 0;  // 00000000 00000000 00000000 00000001
		let group2 = 1 << 1;  // 00000000 00000000 00000000 00000010
		let group3 = 1 << 2;  // 00000000 00000000 00000000 00000100
		let all = 0xffffffff; // 11111111 11111111 11111111 11111111

		// All the physics setting for rigidbody
		this.config = [
		    1, // The density of the shape.
		    0.4, // The coefficient of friction of the shape.
		    0.2, // The coefficient of restitution of the shape.
		    1, // The bits of the collision groups to which the shape belongs.
		    all // The bits of the collision groups with which the shape collides.
		];

		//add field
		let field = this.world.add( { size:[ 6000, 40, 5000 ], pos:[ 0, -20, 0 ], config: this.config } );

		this.config[3] = group2;
		this.config[4] = all;
		
		// ball
		let x = 0;
		let z = 0;
		let y = 100;
		let w = 10;
		let h = 10;
		let d = 10;

		let buffgeoSphere = new THREE.BufferGeometry();
		buffgeoSphere.fromGeometry( new THREE.SphereGeometry( 1, 20, 10 ) );

		let textureBall = new THREE.TextureLoader().load( 'images/ball.png' );                    
		let materialBall = new THREE.MeshBasicMaterial( { color: 0xffffff, map: textureBall } );

		this.ball3D = new THREE.Mesh( buffgeoSphere, materialBall );
		this.ball3D.scale.set( w, w, w );
		this.ball3D.castShadow = true;
		this.ball3D.receiveShadow = true;
		this.scene.add( this.ball3D );                

		//ball body
		this.ball3DBody = this.world.add( { type:'sphere', size:[ w ], pos:[ x, y, z ], move:true, config: this.config, name:'sphere' } );
	    
		//------------ Ring -------------
		let ringGeom = new THREE.RingGeometry( 30, 70, 32 );
		let ringMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000, transparent: false, opacity: 1 } );

		this.ring = new THREE.Mesh( ringGeom, ringMaterial );
		this.ring.name = 'ring';
		this.ring.position.set( 0, 1.2, 0 );
		this.ring.rotation.x = -0.5 * Math.PI;

		this.scene.add( this.ring );	    

	    
	    this.resetBall();
	    this.addWalls()

    	// ---------- Cylinder and Target for dragging ------------
	    let gridWidth = 60;
	    let gridHeight = 100;
		this.start = { x: 0, y: 0 };
		this.prev = { x: 0,	y: 0 };	    

		// An Object3D that contains all the mesh objects in the scene.
		// Rotation of the scene is done by rotating the world about its
		// y-axis.  (I couldn't rotate the camera about the scene since
		// the Raycaster wouldn't work with a camera that was a child
		// of a rotated object.)
		this.worldContainer = new THREE.Object3D();
		this.scene.add( this.worldContainer );

		// An invisible object that is used as the target for raycasting while
		// dragging a cylinder.  I use it to find the new location of the
		// cylinder.  I tried using the ground for this purpose, but to get
		// the motion right, I needed a target that is at the same height
		// above the ground as the point where the user clicked the cylinder.
		this.targetForDragging = new THREE.Mesh(
			new THREE.BoxGeometry( gridWidth*100, 0.01, gridHeight*100 ),
			new THREE.MeshBasicMaterial()
		);

		this.targetForDragging.material.visible = false;

		this.ground = new THREE.Mesh(
			new THREE.BoxGeometry( gridWidth*100, 1, gridHeight*100 ),
			new THREE.MeshLambertMaterial( { color:"green" } )
		);
		this.ground.material.visible = false;
		this.ground.receiveShadow = true;

		this.ground.position.y = -0.5;  // top of base lies in the plane y = -5;
		this.worldContainer.add( this.ground );

		//targetForDragging.material.transparent = true;  // This was used for debugging
		//targetForDragging.material.opacity = 0.1;
		//world.add(targetForDragging);	    


		// paddle mesh
		this.matBoxHit = new THREE.MeshBasicMaterial( { color: 0x383838 } );
		this.matBox = new THREE.MeshBasicMaterial( { color: 0x58AA80 } );
		let buffgeoBox = new THREE.BufferGeometry();
		buffgeoBox.fromGeometry( new THREE.BoxGeometry( 20, 40, 60 ) );

		this.paddle = new THREE.Mesh( buffgeoBox, this.matBox );
		this.scene.add( this.paddle );
		this.paddle.position.set( -150, 30, -150 );

		// paddle body
		this.config[3] = 1;
		this.config[4] = all;
		this.paddleBody = this.world.add( { size:[ 20, 40, 60 ], pos:[ -150, 30, -150 ], rot:[ 0, 0, 0 ], move:true, noSleep:true, config: this.config, name:'paddle', kinematic:true } );

		this.worldContainer.add( this.paddle );

		this.addCylinder( 100, 100 );
		this.addCylinder( 0, 150 );
		this.addCylinder( -150, -70 );
		this.addCylinder( -80, 50 );
		this.addCylinder( 50, -120 );

		this.eventAction = this.DRAG;
		this.container.addEventListener( "mousedown", this.doEventStart.bind( this ) );
		this.container.addEventListener( "touchstart", this.doEventStart.bind( this ) );

		window.addEventListener( "resize", function( event ){

			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize( window.innerWidth, window.innerHeight );

		}.bind( this ), false );

		document.body.style.cursor = "pointer";

		let scope = this;
		new THREE.ObjectLoader().load( "models/pitch/stadium.json", function( pitch ) {
			
			// Pitch Base look in the plus          
			//materials[0].side = THREE.DoubleSide;                 
			//let ground =  new THREE.Mesh( geometry, materials[0] );
			//ground.scale.set( 20, 20, 20 );
			//ground.receiveShadow = true;
			//scope.scene.add( ground );

			pitch.position.set( -50, -30, -100 );
			pitch.scale.set( 800, 800, 800 );
			pitch.receiveShadow = true;

			let content = new THREE.Object3D();
			content.add( pitch );
			scope.scene.add( content ); 

			scope.render();

		});

	};

	resetBall(){

 		//this.state.phase = "wait";
 		this.ball3DBody.angularVelocity.set( 0, 0, 0 );
 		this.ball3DBody.linearVelocity.set( 0, 0, 0 );
 		this.ball3DBody.position.set( 0, 0, 0 );

	};

	kickBall() {

	    //this.state.phase = "simulate";

	    let x = this.shotControl.forceX;
	    let y = this.shotControl.forceY;
	    let z = this.shotControl.forceZ;
	    let originX = this.shotControl.originX;
	    let originY = this.shotControl.originY;

		let center = new THREE.Vector3();
		let force = new THREE.Vector3( 0.06, 0.03, 0.04 );
        this.ball3DBody.applyImpulse( center, force );

	};

	render() {

		const render = this.render.bind( this ); 
		requestAnimationFrame( render );

	    let time = performance.now();
	    let elapsed = ( time - this.lastTime ) * .003;

	    if ( this.state.phase == "simulate" ) {

	    	//bend ball
		    //let ballBend = this.ballBody.velocity;
		    //ballBend = ballBend.cross( this.ballBody.angularVelocity );
	    	//ballBend = ballBend.mult( elapsed * .0002 );
	    	//this.ballBody.velocity = this.ballBody.velocity.vsub( ballBend );
			//this.world.step( elapsed );

	    };

	    this.lastTime = time;

	    this.paddleBody.setPosition( this.paddle.position );	    

	    //this.ball.position.copy( this.ballBody.position );
	    //this.ball.quaternion.copy( this.ballBody.quaternion );
	    //this.ring.position.set( this.ball.position.x, this.ring.position.y, this.ball.position.z );

	    this.world.step();

	    this.ball3D.position.copy( this.ball3DBody.getPosition() );
	    this.ball3D.quaternion.copy( this.ball3DBody.getQuaternion() );
	    this.ring.position.set( this.ball3D.position.x, this.ring.position.y, this.ball3D.position.z );
	    
	    this.renderer.render( this.scene, this.camera )
	    
	};

	addWalls(){

		// add walls
		let walls = new Array();
		let wallsBody = new Array();
		let matWall = new THREE.MeshBasicMaterial( { color: 0x004400 } );
		let buffgeoWall = new THREE.BufferGeometry();

		let wallLeft = { x: 0, y: 15, z: -1950, w: 6000, h: 150, d: 10 };
		let wallRight = { x: 0, y: 15, z: 1950, w: 6000, h: 150, d: 10 };
		let wallTop = { x: -3000, y: 15, z: 0, w: 10, h: 150, d: 3900 };
		let wallBottom = { x: 3000, y: 15, z: 0, w: 10, h: 150, d: 3900 };

		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallLeft.w, wallLeft.h, wallLeft.d ), matWall ) );
		this.scene.add( walls[0] );

		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallRight.w, wallRight.h, wallRight.d ), matWall ) );
		this.scene.add( walls[1] );

		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallTop.w, wallTop.h, wallTop.d ), matWall ) );
		this.scene.add( walls[2] );

		walls.push( new THREE.Mesh( new THREE.BoxGeometry( wallBottom.w, wallBottom.h, wallBottom.d ), matWall ) );
		this.scene.add( walls[3] );

		wallsBody.push( this.world.add( { size:[ wallLeft.w, wallLeft.h, wallLeft.d ], pos:[ wallLeft.x, wallLeft.y, wallLeft.z ], move:false, config: this.config, name:'wallLeft' } ) );
		walls[0].position.copy( wallsBody[0].getPosition() );
		walls[0].quaternion.copy( wallsBody[0].getQuaternion() );

		wallsBody.push( this.world.add( { size:[ wallRight.w, wallRight.h, wallRight.d ], pos:[ wallRight.x, wallRight.y, wallRight.z ], move:false, config: this.config, name:'wallright' } ) );
		walls[1].position.copy( wallsBody[1].getPosition() );
		walls[1].quaternion.copy( wallsBody[1].getQuaternion() );

		wallsBody.push( this.world.add( { size:[ wallTop.w, wallTop.h, wallTop.d ], pos:[ wallTop.x, wallTop.y, wallTop.z ], move:false, config: this.config, name:'wallTop' } ) );
		walls[2].position.copy( wallsBody[2].getPosition() );
		walls[2].quaternion.copy( wallsBody[2].getQuaternion() );

		wallsBody.push( this.world.add( { size:[ wallBottom.w, wallBottom.h, wallBottom.d ], pos:[ wallBottom.x, wallBottom.y, wallBottom.z ], move:false, config: this.config, name:'wallBottom' } ) );
		walls[3].position.copy( wallsBody[3].getPosition() );
		walls[3].quaternion.copy( wallsBody[3].getQuaternion() );
	
	};

	addCylinder( x, z ) {

		this.cylinderSpec = new THREE.Mesh(
			new THREE.CylinderGeometry( 10, 20, 60, 16, 32 ),
			new THREE.MeshLambertMaterial( { color:"yellow" } )
		);

		let cylinderMesh = this.cylinderSpec.clone();
		cylinderMesh.position.set( x, 30, z );
		this.cylinderMeshes.push( cylinderMesh );
		this.worldContainer.add( cylinderMesh );
	
		let cylinderBody = this.world.add( { type:'cylinder', size:[ 20, 30, 20 ], pos:[ x, 30, z ], move:true, noSleep:true, config: this.config, name:'cylinder' + this.cylinderMeshes.length, kinematic:true } );
		this.cylinderBodies.push( cylinderBody );


	};

	////////////////////////////
	// Mouse / Touch Events
	doChangeEventAction() {

		this.controls.enabled = false;

		if ( document.getElementById( "eventDrag" ).checked ) {
			this.eventAction = this.DRAG;
		
		} else if ( document.getElementById( "eventAdd" ).checked ) {
			this.eventAction = this.ADD;
		
		} else {
			this.eventAction = this.DELETE;
		};

	};	
		
	objectSelect( x, y ) {

  		// remove last target if any
		if ( this.targetForDragging.parent == this.worldContainer ) {
			this.worldContainer.remove( this.targetForDragging );
		};

		let a = 2 * x / window.innerWidth - 1;
		let b = 1 - 2 * y / window.innerHeight;

		this.raycaster.setFromCamera( new THREE.Vector2( a, b ), this.camera );
		let intersects = this.raycaster.intersectObjects( this.worldContainer.children );

		if ( intersects.length == 0 ) {
			return false;
		};

		let item = intersects[ 0 ];
		let objectHit = item.object;
		let idx = this.cylinderMeshes.indexOf( objectHit );

		switch ( this.eventAction ) {

			case this.DRAG:

				if ( objectHit == this.ground ) {
					return false;
				} else {
					
				    if ( idx !== -1 ) {
						this.dragItemBody = this.cylinderBodies[ idx ];
				    };

					this.dragItem = objectHit;
					this.worldContainer.add( this.targetForDragging );
					this.targetForDragging.position.set( 0, item.point.y, 0 );
					return true;
				};

			case this.ADD:

				if ( objectHit == this.ground ) {

					// Gives the point of intersection in world coords
					let locationX = item.point.x;
					let locationZ = item.point.z;
					let coords = new THREE.Vector3( locationX, 0, locationZ );
					
					// to add cylider in correct position, neew local coords for the world object
					this.worldContainer.worldToLocal( coords );
					this.addCylinder( coords.x, coords.z );
				};
				return false;
			
			case this.DELETE: // DELETE

				if ( objectHit != this.ground ) {

				    if ( idx !== -1 ) {
				    	this.world.remove( this.cylinders[ idx ] );
				    };

					this.worldContainer.remove( objectHit );
				};
				return false;
		};
	};

	objectMove( x, y ) {

		this.controls.enabled = false;

		// drag
		let a = 2 * x / window.innerWidth - 1;
		let b = 1 - 2 * y / window.innerHeight;
		this.raycaster.setFromCamera( new THREE.Vector2( a, b ), this.camera );
		let intersects = this.raycaster.intersectObject( this.targetForDragging ); 

		if ( intersects.length == 0 ) {
			return;
		};

		let locationX = intersects[0].point.x;
		let locationZ = intersects[0].point.z;
		let coords = new THREE.Vector3( locationX, 0, locationZ );
		
		this.worldContainer.worldToLocal( coords );
		
		// clamp coords to a range so object stays on ground
		//a = Math.min( 45, Math.max( -45, coords.x ) );
		//b = Math.min( 45, Math.max( -45, coords.z ) );
	
		this.dragItem.position.set( coords.x, 30, coords.z );
		
		if ( this.dragItemBody ){
			this.dragItemBody.setPosition( this.dragItem.position );
		};

	};

	doEventStart( event ) {
		
		if ( event.changedTouches ) {

			if ( event.touches.length != 1 ) {
				this.doEventEnd( event );
				return;
			};

		};
		
		event.preventDefault();

		if ( this.dragging ) {
			return;
		};

		let r = this.container.getBoundingClientRect();

		if ( event.changedTouches ) {

			var x = event.touches[ 0 ].clientX - r.left;
			var y = event.touches[ 0 ].clientY - r.top;

		} else {
	
			var x = event.clientX - r.left;
			var y = event.clientY - r.top;

		};
	
		this.prev.x = this.start.x = x;
		this.prev.y= this.start.x = y;
		this.dragging = this.objectSelect( x, y );

		let scope = this;

		if ( this.dragging ) {

			if ( event.changedTouches ) {
			
				this.container.addEventListener( "touchmove", scope.doEventMove.bind( this ) );
				this.container.addEventListener( "touchend", scope.doEventEnd.bind( this ) );
			
			} else {
			
				this.container.addEventListener( "mousemove", scope.doEventMove.bind( this ) );
				this.container.addEventListener( "mouseup", scope.doEventEnd.bind( this ) );
			
			};
		};
	};

	doEventMove( event ) {
	
		if ( this.dragging ) {

			if ( event.changedTouches ) {

				if ( event.touches.length != 1 ) {
					this.doEventEnd( event );
					return;
				};

			};

			event.preventDefault();
			let r = this.container.getBoundingClientRect();

			if ( event.changedTouches ) {
				var x = event.touches[ 0 ].clientX - r.left;
				var y = event.touches[ 0 ].clientY - r.top;
			
			} else {

				var x = event.clientX - r.left;
				var y = event.clientY - r.top;
			};

			this.objectMove( x, y );
			this.prev.x = x;
			this.prev.y = y;

		};
	};

	doEventEnd( event ) {
		
		this.controls.enabled = true;
		this.dragItem = null;
		this.dragItemBody = null;
		
		let scope = this;

		if ( this.dragging ) {

			this.dragging = false;
			
			if ( event.changedTouches ) {

				this.container.removeEventListener( "touchmove", scope.doEventMove.bind( this ) );
				this.container.removeEventListener( "touchend", scope.doEventEnd.bind( this ) );

			} else {

				this.container.removeEventListener( "mousemove", scope.doEventMove.bind( this ) );
				this.container.removeEventListener( "mouseup", scope.doEventEnd.bind( this ) );

			};
		};

		if ( this.endCallback ) {
			this.endCallback( event );
		};
						
		if ( this.cancelCallback ) {
			this.cancelCallback( event );
		
		};			

	};

};

let kickBall = new KickBall();

document.getElementById( "buttonShoot" ).addEventListener( "click", function() {
	kickBall.kickBall();
});

document.getElementById( "buttonReset" ).addEventListener( "click", function() {
	kickBall.resetBall();
});
