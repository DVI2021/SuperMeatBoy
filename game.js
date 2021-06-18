var game = function() {

var Q = window.Q = Quintus()
	       .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio")

	       .setup('Super Meat Boy',
	       {
	       	width: 800,
	       	height: 600,
	       	scaleToFit : true //Scale the game to fit the screen of the player´s device
	       })
	       .controls().enableSound()
	       .touch();     
var acumulador2 = 0;

/*------------TECLA PARA REINICIAR NIVEL------------*/
document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

var reset = false;

function keyDownHandler(event) {
    if(event.keyCode == 82) reset = true; // R
}

function keyUpHandler(event) {
    if(event.keyCode == 82) reset = false; // R
}

	/*------------SUPER MEAT BOY------------*/
	Q.Sprite.extend("SuperMeatBoy",{
        
        init: function(p){
            this._super(p, {
                sheet: "meat_boy_end",
                sprite: "meat_boy_end",
                speed: 200,
                frame: 0,
                scale: 1,
				gravity: .6,
				onWall: false
            });
            this.add("2d, platformerControls, animation");
			this.on("bump.left, bump.right", this, "stick_on_wall");
			this.on("jump");
    		this.on("jumped");
			this.on("deathAnimTr", this, "death_aux");
			
			//Ajustar hitbox
			this.p.points = [];
			this.p.points.push([25,30]);
			this.p.points.push([25,-15]);
			this.p.points.push([-28,-15]);
			this.p.points.push([-28,30]);
        },

		//Salto en muro
		//La gravedad se reduce un poco para poder saltar mejor desde el muro
		stick_on_wall: function(collision){
			
			this.p.onWall = true;
			this.p.gravity = .5;
			if(collision.normalX == 1 && collision.normalY == 0){
				this.p.landed = true;
				this.play("wall_left");
			}
			if(collision.normalX == -1 && collision.normalY == 0){
				this.p.landed = true;
				this.play("wall_right");
			}
		},

		//Sonido de salto
		jump: function(obj) {
			if (!obj.p.playedJump) {
			  Q.audio.play("Meat_jumps0.mp3");
			  obj.p.playedJump = true;
			}
		},
		
		jumped: function(obj) {
			obj.p.playedJump = false;
		},

        step: function(dt){

			/*Hace que la velocidad de movimiento aumente progresivamente desde 200(velMin) a 500(velMax) 
			También mantiene la inercia al dejar de pulsar la tecla. Esta reducción se realiza en 
			quintus_imputs.js -> platformerControls (lineas 847 - 855)*/ 
			if(Q.inputs['left']){
                this.play("walk_left");
                //aceleración izq
                if(this.p.speed < 500){
                    this.p.speed += 10;
                }
                
            }
			
            if(Q.inputs['right']){
                this.play("walk_right");
                //aceleración dcha
                if(this.p.speed < 500){
                    this.p.speed += 10;
                }
                
            }

			//Salto desde muro. Separa a SMB ligeramente del muro
			if(Q.inputs['up'] && this.p.onWall){
				
				this.p.onWall = false;
				this.p.vy = -300;
				//Si esta en un muro del lado izquierdo
				if(this.p.direction == 'right'){
					this.p.vx = -300;
				}
				//Si esta en un muro del lado derecho
				else if(this.p.direction == 'left'){
					this.p.vx = 300;
				}
				
			}

			if(this.p.vx == 0 && this.p.vy == 0){
				this.play('stand_' + this.p.direction);
				this.p.speed = 200;
				this.p.gravity = .6;
			}


			if(this.p.vy != 0){
				if(this.p.vx > 0){
					this.play("jump_right");
				} else if(this.p.vx < 0){
					this.play("jump_left");
				}
			}


			//borders
			if(smb.p.x < minX) smb.p.x = minX;
			if(smb.p.x > maxX) smb.p.x = maxX;
			if(smb.p.y < minY) {
				smb.p.y = minY;
				this.p.vy = 0; //si no se queda medio quieto al llegar al tope
			}	

			Q.state.set("timer", dt);

			//Al pulsar la tecla de reset, reinicia el nivel
			if (reset){
				this.destroy();
				Q.stageScene(Q.stage(1).scene.name, 1);
				Q.stageScene("timer", 2);
			}

        },

		//Realiza la animacion de muerte de SMB y reinicia el nivel cuando esta ha terminado
		die: function(){
			this.play("death", 1);	
        },

		death_aux: function(p){
			this.destroy();
			Q.stageScene(Q.stage(1).scene.name, 1);
			Q.stageScene("timer", 2);
		}
    });

	/*------------SIERRA------------*/
	//Sierra que al ser golpeada por MeatBoy lo destruye
	Q.Sprite.extend("Saw",{
		init: function(p){
			this._super(p, {
				 sheet: "utilities",
				 frame: 55,
				 scale: 1,
				 sensor: true,
				 movex: 0,
				 movey: 0,
				 moveang: 0,
				 distangx: 0,
				 distangy: 0
			});
			this.p.points = [];
			this.initx = this.p.x+this.p.cx;
			this.inity = this.p.y-this.p.cy;

			if(p.movex > 0) this.right = true;
			if(p.movey > 0) this.down = true;
			
			//Puntos en un circulo desde 0 a 15, donde x: 2r / (nump / 2) e y: sqrt( sqr(r) - sqr(x)), 
			//esto soluciona la primera mitad del circulo, los valores negativos en orden inverso son para la segunda mitad
			for(var i = 0; i < 16; i++) {
		        if(i<8) this.p.points.push([((100/8)*i)-50, Math.sqrt(Math.pow(50,2)-Math.pow((((100/8)*i)-50),2))]);
		    	if(i>=8) this.p.points.push([((100/8)*(i-(2*(i-8))))-50, (-1)*Math.sqrt(Math.pow(50,2)-Math.pow((((100/8)*(i-(2*(i-8))))-50),2))]);
		    }

			this.on("sensor", this, "kill");		
		},

		step: function(dt){
			var p = this.p;
			p.angle += -200 * dt;

			//Si hay movimiento angular, positivo rota clockwise, negativo rota anti-clockwise
			//Para utilizarlo con Tiled, añadir campos distangx y distangy para la posicion del punto respecto a la del sprite, y el campo moveang para la velocidad (a mayor valor mas velocidad)
			//Es necesario importar el script math.js para que funcione
			//La posicion inicial se calcula como initx = p.x + p.cx e inity = p.y - p.cy, ya que inicialmente no tiene en cuenta el ancho del srpite, sin esto rota sin control
			if(p.moveang != 0){
				var px = this.initx+p.distangx, py = this.inity+p.distangy,
				ang = dt*p.moveang;

				//Las posiciones resultado se calculan multiplicando la matriz de la posicion del sprite por la matriz de rotacion sobre el punto x, y
				//Por lo tanto Xout e Yout son el resultado, Xin e Yin la posicion del sprite y X e Y el punto sobre el que rota
				
				//		[Xout]							[1,0,X]		[cos(theta),-sin(theta),0]		[1,0,-X]			[Xin]
				// mR= 	[Yout]	== 	  mRot=	mA*mB*mC=	[0,1,Y]	 *	[sin(theta),cos(theta),0]	*	[0,1,-Y]   *   mO =	[Yin]
				//		[1]								[0,0,1]		[0,0,1]							[0,0,1]				[1]

				var mO = math.matrix([[p.x], [p.y], [1]]),
				mA = math.matrix([[1, 0, px], [0, 1, py], [0, 0, 1]]),
				mB = math.matrix([[Math.cos(ang), Math.sin(ang)*(-1), 0],[Math.sin(ang), Math.cos(ang), 0],[0, 0, 1]]),
				mC = math.matrix([[1, 0, px*(-1)], [0, 1, py*(-1)], [0, 0, 1]]),

				mR = math.multiply(math.multiply(math.multiply(mA, mB), mC), mO);
			
				this.p.x = math.subset(mR, math.index(0,0));
				this.p.y = math.subset(mR, math.index(1,0));
				
			}
			//Si hay movimiento horizontal, viaja hasta el p.x + p.movex y vuelve en bucle (solo valores positivos)
			//Para utilizarlo con Tiled, añadir campo movex con el valor hasta el que quieres moverlo
			else if(p.movex != 0){
				if(this.right){
					this.p.x += dt*100;
					if(this.p.x > (this.initx + p.movex)) this.right = false;
				}
				else{
					this.p.x -= dt*100;
					if(this.p.x < this.initx) this.right = true;
				}
			}
			//Si hay movimiento vertical, viaja hasta el p.y + p.movey y vuelve en bucle (solo valores positivos)
			//Para utilizarlo con Tiled, añadir campo movey con el valor hasta el que quieres moverlo
			else if(p.movey != 0){
				if(this.down){
					this.p.y += dt*100;
					if(this.p.y > (this.inity + p.movey)) this.down = false;
				}
				else{
					this.p.y -= dt*100;
					if(this.p.y < this.inity) this.down = true;
				}
			}
		},

		kill: function(collision){
				if(!collision.isA("SuperMeatBoy")) return;
				collision.die();
				Q.audio.play("SawDeath0.mp3"); // Saw.mp3
				
		}
	});

	/*------------BANDAGE GIRL(GOAL)------------*/
	//Meta de los diversos mapas, al ser golpeada lanza una animacion, actualiza el timer y cambia de mapa
	//si es el mapa final, lanza la pantalla de End Game en su lugar
	Q.Sprite.extend("Goal",{
		init: function(p){
			this._super(p, {
				 sheet: "goalAnim",
				 sprite: "goalAnim",
				 frame: 55,
				 x: 350,
				 y:900,
				 scale: 1,
				 sensor: true,
				 direction: "right"
			 });
			this.add("animation")
			this.on('sensor', this, 'hit');
			this.p.level;

			//Ajustar hitbox
			this.p.points = [];
			this.p.points.push([30,45]);
			this.p.points.push([35,-10]);
			this.p.points.push([-35,-10]);
			this.p.points.push([-30,45]);
			this.anim();
		},
		//En caso de colisionar MeatBoy con BandageGirl actualizamos el acumulador para el timer final,
		//eliminamos a MeatBoy para evitar que el usuario se mueva,
		//lanzamos la animacion de transicion y finalmente cambiamos la escena
		hit: function(collision){
			if(!collision.isA("SuperMeatBoy")) return;
				
			collision.p.vy = -40;

			this.destroy();
      		var level = this.p.level;
      		acumulador2 += acumulador;

			if(this.p.level != "endGame"){ //transicion entre escena y escena
				if(this.p.level != "X"){
					containerTimer
			      		.animate({x:Q.width/2 - 100, y: Q.width/2 - 115, opacity: 1}, .5, Q.Easing.Quadratic.InOut)
			  	}
				var sprite = new Q.Sprite({ asset: "sierra_negra.png", x: this.stage.viewport.centerX, y: this.stage.viewport.centerY, scale: 1, type: 0 });
				sprite.p.opacity=0;
				sprite.add("tween");
				
	      		this.stage.insert(sprite);
	      		sprite
			        .animate({ opacity: 0, scale: 0 }, .4, Q.Easing.Quadratic.In, {callback: function(){Q.audio.play("SawDeath0.mp3");}})
	      			.chain({  scale: 20, angle: 900, opacity: 10}, 1, Q.Easing.Quadratic.InOut,
	      			 	   {callback: function(){
						 		  				Q.stageScene(level, 1);
						 		  				Q.stageScene("timer", 2);
					}})
			  	collision.destroy(); // destruye al MeatBoy
			}
			//En caso de ser el ultimo nivel calculamos y mostramos el timer acumulado
			else{
				Q.stageScene(this.p.level, 1);
				var ms = acumulador2*1000;
				var s = ms/1000;
				var m = s/60;
		        m = Math.floor(m);
		        s = Math.floor(s) - m*60;
		        ms = Math.floor(ms) - m*60000 - s*1000;

		        while (ms.toString().length < 3)
    				ms = '0' + ms;
		      	while (s.toString().length < 2)
    				s = '0' + s;
		       	while (m.toString().length < 2)
    				m = '0' + m;

				label_timer.p.label = "Total time \n" + m + " : " + s + " : " + ms;
			}
		},

		anim: function(p){
			if (this.p.direction == "right") this.play("scare_right");
			if (this.p.direction == "left") this.play("scare_left");
		}
	});

	/*------------BOSS FINAL------------*/
	Q.Sprite.extend("Boss", {
		init: function(p){
			this._super(p, {
				sheet: "boss",
                sprite: "boss",
				frame: 0,
				vx: 200
			});

		   this.add('2d, animation');
		   this.on("bump.left,bump.right",this, "kill");
		},

		step: function(dt){
			this.play("walk_right_boss");
			if(this.p.vx == 0){
				this.play("death_boss");
			}
		},

		kill: function(collision){
			if(!collision.obj.isA("SuperMeatBoy")) return;
			this.p.vx= 1;
			collision.obj.die();
			Q.audio.play("SawDeath0.mp3");
		}

	});

	/*------------BLOQUES DE ARENA------------*/
	//Arena que se destruye al ser golpeada por MeatBoy
	Q.Sprite.extend("Sand",{
		init: function(p){
			this._super(p, {
				 sprite: "sand",
				 sheet: "sand",
				 frame: 0,
				 collision: true,
				 gravity: 0,
				 scale: 0.8955
			 });
			this.add("animation");
			this.on("hit",this, "anim");
			this.on("erase",this,"erased");
			this.animated = false;
			this.p.points = [];
			this.p.points.push([-33.5,-49]);
			this.p.points.push([-33.5,15]);
			this.p.points.push([33.5,-49]);
			this.p.points.push([33.5,15]);
			
		},
		//En caso de que MeatBoy colisione con el bloque de arena despues de un qequeño delay lo destruimos
		//para quitarnos la malla de colision y creamos un nuevo objeto sin colision en el que animamos la destruccion
		anim: function(collision){
			if(!collision.obj.isA("SuperMeatBoy")) return;
			if(this.animated) return;
			this.animated = true;
			this.play("destroying");	
		},
		erased: function(){
			this.stage.insert(new Q.SandDes({
                        x: this.p.x,
                        y: this.p.y,
                        scale: this.p.scale
                    }));
			Q.audio.play("grass_scamper1.mp3"); // Sand.mp3
			this.destroy();
		}
	});

	//Objeto donde se anima la destruccion de la arena
	Q.Sprite.extend("SandDes",{
		init: function(p){
			this._super(p, {
				 sprite: "sand",
				 sheet: "sand",
				 frame: 0,
				 sensor: true,
				 scale: 0.8955
			 });
			this.add("animation");
			this.on("erase2",this,"erased");
			this.animated = false;
			this.anim();
			
		},
		anim: function(){
			if(this.animated) return;
			this.animated = true;
			this.play("destroying2");	
		},
		erased: function(){
			this.destroy();
		}
	});

	/*------------GENERADOR DE SIERRAS------------*/
	//Objeto desde el que se generan sierras periodicamente, solo funciona si esta angulado en las 4 direcciones principales
	//Para que funcione correctamente con Tiled, darle valor al campo angle: 0 || 90 || 180 || 270 y añadir campos saw_vx y saw_vy
	//Tambien se puede añadir campo spawn para generar sierras mas rapido o lento
	Q.Sprite.extend("SawGenerator",{
		init: function(p){
			this._super(p, {
				 sheet: "SawGen",
				 scale: 1,
				 collision: true,
				 gravity: 0
			 });
			this.on('step', this, "step");
			this.p.saw_vx;
			this.p.saw_vy;
			this.p.time = 0;
			this.p.spawn = 4;
		},
		genSaw: function(){
			var p = this.p, spawnx = 0, spawny = 0;
			if(p.angle == 0) spawnx = -100;
			if(p.angle == 90) spawny = -50;
			if(p.angle == 180) spawnx = 100;
			if(p.angle == 270) spawny = 50;

			this.stage.insert(new Q.SawDes({				
				x: p.x+spawnx,
				y: p.y+spawny,
				vx: p.saw_vx*50,
				vy: p.saw_vy*50,
				angle: p.angle
			}))
			Q.audio.play("Saw_Launcher 01.mp3"); // GenSaw.mp3
		},
		step: function(dt){
			this.p.time += dt;
			if(!this.cooldown && (this.p.time % this.p.spawn) < 0.1) {
				this.cooldown = true;
				this.genSaw();
			}
			if(this.cooldown && (this.p.time+1) % this.p.spawn < 0.1) this.cooldown = false;
		}
	});

	//Objeto sierra con la cualidad de destruirse si colisiona contra algo que no sea el propio generador o una llave,
	//al destruirse generamos una animacion
	Q.Sprite.extend("SawDes",{
		init: function(p){
			this._super(p, {
				 sheet: "utilities",
				 frame: 18,
				 scale: 0.65,
				 gravity: 0
			 });
			this.p.points = [];
			
			for(var i = 0; i < 16; i++) {
		        if(i<8) this.p.points.push([((100/8)*i)-50, Math.sqrt(Math.pow(50,2)-Math.pow((((100/8)*i)-50),2))]);
		    	if(i>=8) this.p.points.push([((100/8)*(i-(2*(i-8))))-50, (-1)*Math.sqrt(Math.pow(50,2)-Math.pow((((100/8)*(i-(2*(i-8))))-50),2))]);
		    }

			this.kill = false;
			this.add("2d");
			this.on('hit', this, 'die');
		},
		die: function(collision){
			if(collision.obj.isA("SawGenerator") || collision.obj.isA("Key")) return;
			if(!this.kill){
				this.kill = true;
				if(collision.obj.isA("SuperMeatBoy")) collision.obj.die();

				this.stage.insert(new Q.SawDesAnim({				
					x: this.p.x,
					y: this.p.y,
					angle: Math.random() * 360
				}));
				Q.audio.play("saw_break0.mp3"); // SawDes.mp3
				this.destroy();
			}		
		},
		step: function(dt){
			this.p.angle += dt*1500;
		}
	});
	
	//Animacion de destruccion de la sierra generada
	Q.Sprite.extend("SawDesAnim",{
		init: function(p) {			
			this._super(p, {			 
				 sheet: "sawDesAnim",
				 sprite: "sawDesAnim",
				 frame: 0,
				 scale: 0.65,
				 sensor: true
			 });
			this.add("animation");
			this.anim();
			this.on("sawDess", this, "sawDes")
		},
		anim: function(p) {			
			this.play("destroySaw");
		},
		sawDes: function(p) {			
			this.destroy();
		}
	});

	/*------------CERROJOS Y LLAVE------------*/

	//Cerrojo que se desbloquea al coger la llave adecuada, puede tener un valor de llave para desbloquear varios cerrojos en cadena
	//Para usar en Tiled, establecer campo ukey al valor de la key que lo activara y tkey para que active a su vez otra
	Q.Sprite.extend("Keyhole",{
		init: function(p){
			this._super(p, {
				 sheet: "utilities",
				 frame: 55,
				 scale: 0.75,
				 collision: true,
				 gravity: 0,
				 ukey: -1, 	//unlockKey
				 tkey: -1  //triggerNextKey
			 });
			this.p.points = [];
			this.p.points.push([-41.5,-41.5]);
			this.p.points.push([-41.5,41.5]);
			this.p.points.push([41.5,-41.5]);
			this.p.points.push([41.5,41.5]);

			Q.state.on("change.key", this, "unlock");
			this.add("tween");			
		},
		unlock: function(){
			if(Q.state.get("key") != this.p.ukey) return;
			
			Q.audio.play("LockBreak0.mp3"); // Keyhole.mp3
			this.animate({ scale: 0 }, 0.8, Q.Easing.Quadratic.Out, { callback: function(){ Q.state.set("key",this.p.tkey); this.destroy(); } });
		}
	});

	//Llave que al ser recogida desbloquea el/los cerrojos con el mismo valos de llave
	//Para usar en Tiled, establecer campo key al valor de la key que va a activar
	Q.Sprite.extend("Key",{
		init: function(p){
			this._super(p, {
				 sheet: "utilities",
				 frame: 55,
				 scale: 0.5,
				 sensor: true,
				 key: -1
			 });
			this.p.points = [];
			this.p.points.push([-15.5,-33]);
			this.p.points.push([-15.5,27]);
			this.p.points.push([21.5,27]);
			this.p.points.push([21.5,-33]);

			this.on("sensor", this, "pick");			
		},
		pick: function(collision){
			if(!collision.isA("SuperMeatBoy")) return;
			Q.state.set("key",this.p.key);
			Q.audio.play("KeyPickup_Gauntlet.mp3"); // key.mp3
			this.destroy();
		}
	});


	//3 objetos para el correcto dibujado de los mapas, con ellos puedo crear superficies anguladas u objetos no interactuables
	//con cualquier angulo y tamaño
	Q.Sprite.extend("ModTilesObj",{
			init: function(p) {
				
				this._super(p, {
					 sheet: "modTilesObj",
					 frame: 55,
					 sensor: true,
					 rot: false
				 });
			},
			step: function(dt){
				if(!this.p.rot) return;
				this.p.angle += dt*143.3;
			}
		});

	Q.Sprite.extend("ModTilesDark",{
			init: function(p) {
				
				this._super(p, {
					 sheet: "modTilesdark",
					 frame: 55,
					 sensor: true
				 });
			}
		});

	Q.Sprite.extend("ModTiles",{
			init: function(p) {
				this._super(p, {
					 sheet: "modTileslight",
					 frame: 55
				 });
			}
		});

	Q.load(["lvl_1.tmx", "lvl_2.tmx", "lvl_4.tmx", "lvl_boss.tmx",//tmx
		    "WorldMapTheme.mp3", "ForestFunk.mp3", "Whip03.mp3", "Escape.mp3", "ChoirUnlock.mp3", "SawDeath0.mp3", "Saw_Launcher 01.mp3", //music
		    "saw_break0.mp3", "LockBreak0.mp3", "KeyPickup_Gauntlet.mp3", "grass_scamper1.mp3", //music
			"Meat_jumps0.mp3", "Meat_Landing0.mp3", "Meat_Landing1.mp3", //sound effects
		    "portada.png", "bg_base.png", "foresttiles01.png", "foresttiles01Fix.png", //sprites
		    "smb_anim.png", "smb_anim.json", "forestall.png", "forestdarkall.png", "foresttiles01bg.png", "goal.png", "boss.png", "bg_boss.png",//sprites
		    "forestsetObj.png", "utilities.png", "end.png", "sand.png", "sawGenerator.png", "sawDesAnim.png", "sierra_negra.png", //sprites
		    "modTiles1.json", "modTiles2.json","modTilesObj.json", "utilities.json", "sand.json", "sawGenerator.json","sawDesAnim.json", "goal.json", "boss.json"], function() {
		
		
		Q.compileSheets("smb_anim.png", "smb_anim.json");
		Q.compileSheets("foresttiles01bg.png","modTiles1.json");
		Q.compileSheets("foresttiles01Fix.png","modTiles2.json");
		Q.compileSheets("forestsetObj.png","modTilesObj.json");
		Q.compileSheets("utilities.png","utilities.json");
		Q.compileSheets("sand.png", "sand.json");
		Q.compileSheets("sawGenerator.png", "sawGenerator.json");
		Q.compileSheets("sawDesAnim.png", "sawDesAnim.json");
		Q.compileSheets("goal.png", "goal.json");
		Q.compileSheets("boss.png", "boss.json");

		//Animaciones de SMB
		Q.animations("meat_boy_end", {
			walk_right: { frames: [9,10,11,10], rate: 1/6},
			walk_left: { frames: [1,2,3,2], rate: 1/6},
			jump_right: { frames: [13], rate: 1/6},
			wall_right:{frames: [4], loop: false},
			jump_left: { frames: [5], rate: 1/6},
			wall_left:{frames: [12], loop: false},
			stand_right: { frames: [8], loop: false},
			stand_left: { frames: [0], loop: false},
			death: { frames: [16, 17, 18], rate: 1/14, loop: false, trigger: "deathAnimTr"}
		});

		//Animaciones del jefe final
		Q.animations("boss", {
			walk_right_boss: {frames: [0,1,2,3], rate: 1/6},
			death_boss:{frames: [4], loop: false}
		});

		//Animacion de arena deshaciendose
		Q.animations("sand", {
			destroying: { frames: [0], next: 'bodyDes', rate: 1, trigger: "erase"},
			bodyDes: { frames: [0], rate: 1/100, trigger: "erase"},
			destroying2: { frames: [0,1,2,3,4,5,6,7,8,9,10], next: 'destroyed', rate: 1/10},
			destroyed: { frames: [11,12], rate: 1/10, loop:false, trigger: "erase2"}
		});

		//Animacion de destrucción de las sierras lanzadas por el generador de sierras
		Q.animations("sawDesAnim", {
			destroySaw: { frames: [0,1,2,3,4], loop: false, rate: 1/10, trigger: "sawDess"}
		});

		//Animaciones de Bandage Girl(Goal)
		Q.animations("goalAnim", {
			scare_left: { frames: [0,1], loop: true, rate: 4/5},
			scare_right: { frames: [3,4], loop: true, rate: 4/5}
		});

		//Estado que lleva el id de la llave activada en este momento
		Q.state.reset({ key: -2, timer: "" });

		/*------------NIVEL 1------------*/
		Q.scene("level1", function (stage){
		
			Q.stageTMX("lvl_1.tmx", stage);
		
			smb = new Q.SuperMeatBoy({x: 202, y: 1124});
			stage.insert(smb);
			
			minX = 25;
			maxX = 1885;
			minY = 18;
			stage.add("viewport").follow(smb,{x: true, y: true},{minX:1, maxX: 1340, minY: 0, maxY: 880}); //la camara sigue a smb, AQUI SE MODIFICA LA CAMARA
			
			stage.viewport.scale = .7; //para acercar mas o menos la camara
			stage.on("destroy",function() {
				smb.destroy(); //para cuando salimos de la escena ya no reciba mas eventos de teclado

			});


			Q.audio.play("ForestFunk.mp3", {loop: true});
		});

		/*------------NIVEL 2------------*/
		Q.scene("level2", function (stage){

			Q.stageTMX("lvl_2.tmx", stage);
		
			smb = new Q.SuperMeatBoy({x: 696, y: 1304});
			stage.insert(smb);

			minX = 25;
			maxX = 1885;
			minY = 18;
			stage.add("viewport").follow(smb,{x: true, y: true},{minX:0, maxX: 1340, minY: 0, maxY: 1000});
			stage.viewport.scale = .7;
			stage.on("destroy",function() {
				smb.destroy();
			});

		});

		/*------------NIVEL 3------------*/
		Q.scene("level4", function (stage){
			Q.state.reset({ key: -2});

			Q.stageTMX("lvl_4.tmx", stage);
		
			smb = new Q.SuperMeatBoy({x: 195, y: 1350});
			stage.insert(smb);

			minX = 25;
			maxX = 1885;
			minY = 18;
			stage.add("viewport").follow(smb,{x: true, y: true},{minX:1, maxX: 1010, minY: 0, maxY: 1010});
			stage.viewport.scale = .7;
			stage.on("destroy",function() {
				smb.destroy();
			});

		});

		/*------------NIVEL FINAL------------*/
		Q.scene("levelBoss", function (stage){
			Q.stageTMX("lvl_boss.tmx", stage);
			
				smb = new Q.SuperMeatBoy({x: 400, y: 1379}); 
				stage.insert(smb);
				
				boss = new Q.Boss({x: 25, y: 1379});
				stage.insert(boss);

				minX = 25;
				maxX = 3335;
				minY = 18;

				stage.add("viewport").follow(smb,{x: true, y: true},{minX:0, maxX: 2460, minY: 0, maxY: 1000}); //la camara sigue a smb, AQUI SE MODIFICA LA CAMARA
				
				stage.viewport.scale = .7; //para acercar mas o menos la camara
				stage.on("destroy",function() {
					smb.destroy(); //para cuando salimos de la escena ya no reciba mas eventos de teclado

				});
		});

		/*------------TIMER------------*/
		Q.scene("timer", function(stage){
			var time = 0;
			containerTimer = stage.insert(new Q.UI.Container({
				x: -2.5, y: 25, fill: "rgba(255, 255, 255)"
			}));

			label_timer = containerTimer.insert(new Q.UI.Text({x:100, y:0, label: "00 : 00 : 00"}));
			containerTimer.fit(20);
			containerTimer.add("tween");
			Q.state.on("change.timer", this, function(){
				time += Q.state.get("timer");
				acumulador = time;
				var ms = time*1000;
				var s = ms/1000;
				var m = s/60;
		        m = Math.floor(m);
		        s = Math.floor(s) - m*60;
		        ms = Math.floor(ms) - m*60000 - s*1000;

		        while (ms.toString().length < 3)
    				ms = '0' + ms;
		      	while (s.toString().length < 2)
    				s = '0' + s;
		       	while (m.toString().length < 2)
    				m = '0' + m;

				label_timer.p.label = m + " : " + s + " : " + ms;
			});
		});

		/*------------PANTALLA PRINCIPAL------------*/
		Q.scene("mainTitle", function(stage){
			var button = new Q.UI.Button({
				x: Q.width/2,
				y: Q.height/2,
				asset: "portada.png"
			});
			button.p.opacity = 0;
			button.add("tween");
			button.on("click", function () {
				Q.audio.play("Whip03.mp3");
				button
					 .animate({ x: 400, y: 300, scale: 4, opacity: 0 }, .9, Q.Easing.Quadratic.In,
					 		  {callback: function(){
					 		  				Q.clearStages();
					 		  				Q.audio.stop();
					 		  				Q.stageScene("level1", 1); //va a la capa del fondo
					 		  				Q.stageScene("timer", 2);}})
			});
			stage.insert(button);
			button
		        .animate({ x: 400, y: 300, opacity:1 }, .5, Q.Easing.Quadratic.InOut)
		        .chain({ angle: 360}, .3)
			Q.audio.play("WorldMapTheme.mp3", {loop: true});
		});

		/*------------PANTALLA FINAL------------*/
		Q.scene('endGame', function(stage) {
			label_timer.p.y = -12;
			var sprite = new Q.Sprite({ asset: "end.png", x: 400, y: 300, scale: 1 });
			sprite.p.opacity=0;
			sprite.add("tween");
      		stage.insert(sprite);
      		sprite
		        .animate({ x: 400, y:  300, opacity:1 }, 1, Q.Easing.Quadratic.InOut)

			var container = stage.insert(new Q.UI.Container({
				x: Q.width/2, y: Q.height/2, fill: "rgba(255, 127, 72, 0.9)" , border: 2
			}));

			var button2 = container.insert(new Q.UI.Button({
				x: 0, y: 0, fill: "#FFFFFF", label: "Play Again", border:2
			}));

			var label = container.insert(new Q.UI.Text({
				x: 0, y: -10 - button2.p.h, label: "You win !!", size: 25
			}));

			Q.audio.stop();
			button2.on("click",function() {
				Q.clearStages();
				Q.audio.stop();
				acumulador2 = 0;
				Q.stageScene('mainTitle');
			});

			container.fit(20);
			container.add("tween");
			container
        		.animate({ x: 394, y:  370, opacity:1 }, 1, Q.Easing.Quadratic.InOut)

			Q.audio.play("ChoirUnlock.mp3");

			//Nombre de los integrantes
			var container2 = stage.insert(new Q.UI.Container({
				x: 950, y: 550, fill: "rgba(255, 127, 80, 0)" 
			}));

			var label1 = container2.insert(new Q.UI.Text({
				x: 0, y: 0, label: "By: Adrián Salvador Crespo \n Sergio José Gomez Cortés \n Miriam Cabana Ramírez", size: 12, color: "#ffffff"
			}));

			container2.fit(20);
			container2.add("tween");

			container2
        		.animate({ x: 105, y:  550, opacity:1 }, 1.5, Q.Easing.Quadratic.InOut)

        	//Referencias
        	var container3 = stage.insert(new Q.UI.Container({
				x: 1050, y: 550, fill: "rgba(255, 127, 80, 0)" 
			}));

			var label1 = container3.insert(new Q.UI.Text({
				x: 0, y: 0, label: "Original Game by: \n Edmund McMillen and Tommy Refenes", size: 12, color: "#ffffff"
			}));

			container3.fit(20);
			container3.add("tween");

			container3
        		.animate({ x: 660, y:  550, opacity:1 }, 1.5, Q.Easing.Quadratic.InOut)
		});

		//Q.debug = true;
		Q.stageScene("mainTitle");

	});

}