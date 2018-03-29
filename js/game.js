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
		    forceX: -0.03, // left right
		    forceY: 0.03, // up down
		    forceZ: 0.03, // forward backward
		    spinX: -1.22570099936076236, //spin x
		    spinY: -0.550141484066893546, // spin y
		    shoot: this.kickBall.bind( this )
		};

		let gui = new dat.GUI( { autoPlace: false } );
		document.getElementById( "container" ).appendChild( gui.domElement );
		gui.add( this.shotControl, 'forceX', -0.07, 0.07 );
		gui.add( this.shotControl, 'forceY', 0, 0.07 );
		gui.add( this.shotControl, 'forceZ', -0.07, 0.07 );
		gui.add( this.shotControl, 'spinX', -0.55, 0.55 );
		gui.add( this.shotControl, 'spinY', -0.55, 0.55 );
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
		this.group1 = 1 << 0;  // 00000000 00000000 00000000 00000001
		this.group2 = 1 << 1;  // 00000000 00000000 00000000 00000010
		this.group3 = 1 << 2;  // 00000000 00000000 00000000 00000100
		this.all = 0xffffffff; // 11111111 11111111 11111111 11111111

		// All the physics setting for rigidbody
		this.config = [
		    1, // The density of the shape.
		    0.4, // The coefficient of friction of the shape.
		    0.2, // The coefficient of restitution of the shape.
		    1, // The bits of the collision groups to which the shape belongs.
		    this.all // The bits of the collision groups with which the shape collides.
		];

		//add field
		let field = this.world.add( { size:[ 6000, 40, 5000 ], pos:[ 0, -20, 0 ], config: this.config } );
		
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
		buffgeoBox.fromGeometry( new THREE.BoxGeometry( 30, 80, 100 ) );

		this.paddle = new THREE.Mesh( buffgeoBox, this.matBox );
		this.scene.add( this.paddle );
		this.paddle.position.set( -150, 30, -150 );

		// paddle body

		this.paddleBody = this.world.add( { size:[ 30, 80, 100 ], pos:[ -150, 30, -150 ], rot:[ 0, 0, 0 ], move:true, config: this.config, name:'paddle', kinematic:true } );

		this.worldContainer.add( this.paddle );

		this.addPlayer();
		/*
		this.addCylinder( 100, 100 );
		this.addCylinder( 0, 150 );
		this.addCylinder( -150, -70 );
		this.addCylinder( -80, 50 );
		this.addCylinder( 50, -120 );
		*/

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
	    let spinX = this.shotControl.spinX;
	    let spinY = this.shotControl.spinY;

		let center = new THREE.Vector3();
		let force = new THREE.Vector3( x, y, z );
        this.ball3DBody.applyImpulse( center, force );

	};

	render() {

		const render = this.render.bind( this ); 
		requestAnimationFrame( render );

	    let time = performance.now();
	    let elapsed = ( time - this.lastTime ) * .003;

	    this.lastTime = time;
	    this.paddleBody.setPosition( this.paddle.position );	    

	    this.world.step();

		let i = this.cylinderBodies.length;

		while ( i-- ){

			if ( this.dragItem != undefined && this.dragItem.id == this.cylinderMeshes[i].id ){
				this.cylinderBodies[i].setPosition( this.cylinderMeshes[i].position );
				this.cylinderBodies[i].awake();				
			} else {
				this.cylinderBodies[i].isKinematic = false;
				this.cylinderMeshes[i].position.copy( this.cylinderBodies[i].getPosition() );
				this.cylinderMeshes[i].quaternion.copy( this.cylinderBodies[i].getQuaternion() );
			};
		};
		

	    this.ball3D.position.copy( this.ball3DBody.getPosition() );
	    this.ball3D.quaternion.copy( this.ball3DBody.getQuaternion() );

	    this.ring.position.set( this.ball3D.position.x, this.ring.position.y, this.ball3D.position.z );
	    
	    this.renderer.render( this.scene, this.camera );
	    
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

		switch ( this.eventAction ) {

			case this.DRAG:

				if ( objectHit == this.ground ) {
					return false;
				} else {
					
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

				    //if ( idx !== -1 ) {
				    //	this.world.remove( this.cylinders[ idx ] );
				    //};

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
	
		this.dragItem.position.set( coords.x, 20, coords.z );

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
		this.prev.y = this.start.x = y;
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

	addCylinder( x, z, color ) {

		// All the physics setting for rigidbody
		this.config[3] = this.group3;
		this.config[4] = this.all;

		this.cylinder = new THREE.Mesh(
			new THREE.CylinderGeometry( 10, 20, 60, 16, 32 ),
			color
		);

		let cylinderMesh = this.cylinder.clone();
		cylinderMesh.position.set( x, 30, z );
		cylinderMesh.castShadow = true;
		this.cylinderMeshes.push( cylinderMesh );
		this.worldContainer.add( cylinderMesh );
	
		let cylinderBody = this.world.add( { type:'cylinder', size:[ 20, 30, 20 ], pos:[ x, 30, z ], move:true, config: this.config, world: this.world, kinematic: false } );
		this.cylinderBodies.push( cylinderBody );

	};

	addPlayer(){
	  
	  	let redCylinder = new THREE.MeshBasicMaterial( { color: "red" } );
		let blueCylinder = new THREE.MeshBasicMaterial( { color: "blue" } );

		let formation = [
			[ 5, 4, 1 ],
			[ 4, 5, 1 ],
			[ 4, 4, 2 ],
			[ 4, 4, 1, 1 ],
			[ 4, 3, 3 ],
			[ 4, 3, 2 ],
			[ 4, 2, 3, 1 ],
			[ 4, 2, 2, 2 ],
			[ 4, 2, 1, 3 ],
			[ 4, 2, 4, 1 ],
			[ 4, 1, 3, 2 ],
			[ 4, 1, 2, 3 ],
			[ 3, 5, 2, 2 ],
			[ 3, 5, 1, 1 ],
			[ 3, 4, 1, 2 ],
			[ 3, 4, 3 ],
			[ 3, 4, 2, 1 ]
		];

		let width = 2000;
		let height = 1200;
		let pointerFormation = 15;

		let	stepX = 0;
		let stepY = 0;

		for ( let c = 0; c < formation[ pointerFormation ].length; c++ ) {
			stepX += ( width / 2 ) / formation[ pointerFormation ].length;
			for ( let i = 0; i < formation[ pointerFormation ][ c ]; i++ ){
				let step = height / formation[ pointerFormation ][ c ]; 
				stepY = step * ( i + 1 ) - step / 2;
				this.addCylinder( stepX - 100, stepY, redCylinder );
			
			};
			stepY = 0;
		};

		pointerFormation = 4;

		for ( let c = 0; c < formation[ pointerFormation ].length; c++ ) {
			stepX += ( width / 2 ) / formation[ pointerFormation ].length;
			for ( let i = 0; i < formation[ pointerFormation ][ c ]; i++ ){
				var step = height / formation[ pointerFormation ][ c ]; 
				stepY = step * ( i + 1 ) - step / 2;
				this.addCylinder( stepX - 310, stepY, blueCylinder );
			};
			stepY = 0;
		};

		//goalkeeper
		this.addCylinder( 30, 300, redCylinder );
		this.addCylinder( 950, 300, blueCylinder );

	};

	// CCD Continous Collision Detection
	// Must predict next position and check if the ray trajectory if it intersects anything!
	limitSphere( ball, objs ){
		let raycaster = new THREE.Raycaster();
  		raycaster.set( ball.position.clone(), ball.velocity.clone().unit() );
  		raycaster.far = ball.velocity.length();
  		let arr = raycaster.intersectObjects( objs );

  		if( arr.length ){
    		ball.position.copy( arr[0].point );
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
