/**
 * @author Richard Armuelles
 */

navigator.getUserMedia || (navigator.getUserMedia=navigator.mozGetUserMedia
        || navigator.webkitGetUserMedia || navigator.msGetUserMedia);

var LETTER = 0;
var MOVEMENT = 1;
var ALIEN = 2;

var context = {};
var nX = 0;
var nY = 0;
var radius = 3;
var linewidth = 0;
var spacing = 1;
var circleWidth = radius * 2 + linewidth + spacing;
var drawOffset = 0;

// contiene una lista de fragmentos

//var fragment = {
//    x: 0,
//    y: 0,
//    state: 0,
//    directionX: 0,
//    directionY: 0,
//    velocity: 0;
//};
var fragments = [];


//var alien = {
//    x: 0,
//    y: 0,
//    type: 0, // based on array
//    active: false // if true different color
//}

var aliens = [];


var warmUp = 0;

var firstRun = true;
var bullets = [];

bullets[0] = [];
bullets[1] = [];
bullets[2] = [];

var render = [];

var canvasSource = $("#canvasSource")[0];
var canvasBlended = $("#canvasBlend")[0];
var contextSource = canvasSource.getContext("2d");
var contextBlended = canvasBlended.getContext("2d");
var canvas = document.getElementById("myCanvas");

var video = $('#webcam')[0];
var lastImageData;

nX = Math.floor(canvas.width / circleWidth);
nY = Math.floor(canvas.height / circleWidth);

for (var i = 0; i < nX; i++) {
    bullets[0][i] = [];
    bullets[1][i] = [];
    bullets[2][i] = [];
    for (var j = 0; j < nY; j++) {
        bullets[0][i][j] = 1;
        bullets[1][i][j] = 0;
        bullets[2][i][j] = 0;
    }
}

//invierte el eje X para q se sienta como si se viera en un espejo
contextSource.translate(canvasSource.width, 0);
contextSource.scale(-1, 1);

var animateReference;

window.onload = function () {

    context = canvas.getContext("2d");
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;

    fillCanvas();
    webcam();

    (function () {
        // nos detenemos al haber terminado 10 rondas
        if (round < 11) {
            animateCanvas();
            animateReference = setTimeout(arguments.callee, 50);
        } else {
            // termina el juego, popup con el puntaje
            // opciones para twittear etc...
            showPopup();
        }
    })();
}

//Parametros para compartir el puntaje por Twitter

function showPopup() {
    var twitterURL = "https://twitter.com/intent/tweet?url=";
    //var twitterParamURL=encodeURIComponent(document.URL);
    var twitterParamURL=encodeURIComponent("https://node-space-invaders.herokuapp.com/");
    var twitterPostfix="&original_referer=https://dev.twitter.com/docs/intents#tweet-intent";
    var tags="&hashtags="+encodeURIComponent("html5,webrtc,spaceinvaders");
    var text="&text=" + encodeURIComponent("I had a score of: " + score + " in Webcam Space Invaders");

    $("#twitterLink").attr("href",twitterURL + twitterParamURL + text + tags + twitterPostfix);

    $("#scoreText").text("Thanks for playing!, your score is: " + score);
    console.log();
    var val = ($(window).width()/2) - 200;
    console.log(val);
    $("#modal").css({
            "top": (window.height/2) + "px",
            "left": val + "px"
    });
    $("#modal").show();

}



//efectos sonoros
function soundEnded(event) {
    totalSounds--;
}

var totalSounds = 0;
var maxSounds = 20;
function playSound(nToPlay) {
    for (var i = 0; i < nToPlay; i++) {
        if (totalSounds < maxSounds) {
            var snd = new Audio("data/coin.ogg"); // buffers automaticamente al ser creado
            snd.play()
            snd.addEventListener('ended', soundEnded);
            totalSounds++;
        }
    }
}

function drawVideo() {
        contextSource.drawImage(video, 0, 0, video.width, video.height);
}

function webcam() {
    var param = {video:true};
    console.log(param);
    window.navigator.getUserMedia(param, function(stream) {
        if (window.URL) {
            video.src = window.URL.createObjectURL(stream);
        } else {
            video.src = stream;
            video.play();
        }
    }, function(err) {
        console.log(err);

    });
}

var previousScore = 0;
function blend() {
    var currentScore = 0;
    var width = canvasSource.width;
    var height = canvasSource.height;

    // obtiene la imagen de la webcam
    var sourceData = contextSource.getImageData(0, 0, width, height);

    // crea una nueva imagen si la previa imagen no existe
    if (!lastImageData) {
        lastImageData = sourceData;
    }

    // crea una instancia ImageData para recibir el resultado "blended"
    var blendedData = [];
    // blend the 2 images
    differenceAccuracy(blendedData, sourceData.data, lastImageData.data);

    lastImageData = sourceData;


    // this data is an array of pixels from 640x480
    // we need to check whether a group of pixels is more white then black
    // if that's the case we write a white bullet, else we write a black one
    var stepX = Math.floor(video.width / nX); // number of pixels per bullet for x
    var stepY = Math.floor(video.height / nY); // number of pixels per bullet for y, is the same in this case


    if (warmUp > 20) {
        for (var x = 0; x < nX; x++) {
            for (var y = 0; y < nY; y++) {
                var value = getAverageRectangleValue(blendedData, x, y, stepX, stepY, video.width, video.height, 4)
                if (value > 1000) {
                    currentScore++;
                    // we can check if there is a letter pixel there
                    if (bullets[LETTER][x][y] == 1) {
                        // when we touch a letter, the pixel explodes.
                        // we move it to another set of bullets
                        setState(x, y, 0, LETTER, false);

                        var rndX = Math.round(Math.random());
                        var rndY = Math.round(Math.random());


                    }

                    // besides letter pixel we also check if it
                    // is a alien pixel
                    if (bullets[ALIEN][x][y] == 1) {
                        // if so explode the complete alien
                        // first find the alien
                        var aliensLenght = aliens.length;
                        for (var i = 0 ; i < aliensLenght ; i++) {

                            var alien = aliens.shift();

                            if (alien != undefined) {
                                var alX = alien.x;
                                var alY = alien.y;

                                if ((x >= alX && x <= alX+13) &&
                                        (y >= alY && y <= alY+10)) {

                                    // destroy alien
                                    destroyAlien(alien);
                                    break;


                                } else {
                                    // push back on the stack
                                    aliens.push(alien);
                                }

                            }
                        }
                    }


                    setState(x, y, 1, MOVEMENT, false);
                } else {
                    setState(x, y, 0, MOVEMENT, false);
                }
            }
        }
        makeSounds(Math.abs(previousScore - currentScore));
        previousScore = currentScore;
    } else {
        warmUp++;
    }


//        return result;
}

function destroyAlien(alien) {
    // this alien is already removed from the list

    var ledChar = invaders[alien.type];
    for (var i = 0; i < invaders[alien.type].length; i++) {
        for (var j = 8; j >= 0; j--) {

            var rndX = 0;
            var rndY = 0;
            var speed = Math.round(Math.random()*4)+1;

            while (rndX==0 && rndY==0) {
                rndX = Math.round(Math.random()*2)-1;
                rndY = Math.round(Math.random()*2)-1;
            }

            var state = ((ledChar[i] & (1 << j)) != 0);
            bullets[ALIEN][i + alien.x][alien.y -j]=0;
            // replacing with fragments
            if (state == 1) {
                var fragment = {
                    x: (i + alien.x),
                    y: (alien.y -j),
                    state: 1,
                    directionX: rndX,
                    directionY: rndY,
                    velocity: speed
                };
                fragments.push(fragment);
            }
        }
    }

    for (var i = 0 ;i < aliens.length ; i++) {
        var toCheck = aliens.shift();
        if (toCheck.x == alien.x && toCheck.y == alien.y) {
            break;
        } else {
            aliens.push(toCheck);
        }
    }

    // alien is destroyed, select new random one
    if (alien.active && aliens.length > 0) {
        score++;
        var highlight = Math.round(Math.random()*(aliens.length-1));
        aliens[highlight].active=true;
    }
}

function makeSounds(score) {
//        var totalBullets = nX*nY;
//
//        // determine percentage of change
//        var scorePercentage = (score/(totalBullets));
//
//        var nToPlay = Math.round(scorePercentage*2 * maxSounds);
//
//        playSound(nToPlay);
}


function getAverageRectangleValue(data, x, y, w, h, tX, tY, factor) {
    var startValue = 0;
    var target = [];
    for (var i = 0; i < h; i++) {
        startValue = ((y + (i - 1)) * tX + x) * factor * factor;
        for (var j = 0; j < w; j++) {
            target.push(data[startValue]);
            startValue += 4;
        }
    }

    var result = 0;
    // target contains all bytes from part
    for (var i = 0; i < target.length; i++) {
        result += target[i];
    }

    return result;
}

function fastAbs(value) {
    return (value ^ (value >> 31) - (value >> 31));
}

function threshold(value) {
    return (value > 0x20) ? 0x0FF : 0x0;
}

function differenceAccuracy(target, data1, data2) {
    if (data1.length != data2.length) return null;
    var i = 0;

    // walk through each pixel to check the difference
    while (i < (data1.length * 0.25)) {
        var average1 = (data1[4 * i] + data1[4 * i + 1] + data1[4 * i + 2]) / 3;
        var average2 = (data2[4 * i] + data2[4 * i + 1] + data2[4 * i + 2]) / 3;
        var diff = threshold(fastAbs(average1 - average2));
        target[4 * i] = diff;
        target[4 * i + 1] = diff;
        target[4 * i + 2] = diff;
        target[4 * i + 3] = 0xFF;
        ++i;
    }
}

function testWriteAscii(toWrite, baseOffsetX, baseOffsetY) {
    for (var i = 0; i < toWrite.length; i++) {
        var char = toWrite.charCodeAt(i);
        testWrite(font[char], baseOffsetX + font[char].length * i, baseOffsetY, false);
    }
}


function testWrite(ledChar, xOffset, yOffset, inverse) {


    for (var i = 0; i < ledChar.length; i++) {
        // each array contains values of 1 row
        if (!inverse) {
            for (var j = 0; j < 8; j++) {
                var state = ((ledChar[i] & (1 << j)) != 0);
                setState(i + xOffset, j + yOffset, state, 0, true);
            }
        } else {
            for (var j = 8; j >= 0; j--) {
                var state = ((ledChar[i] & (1 << j)) != 0);
                setState(i + xOffset,  yOffset+8 -j, state, 0, true);
            }
        }
    }
}

var EXPL_STEP = 2;
function animateCanvas() {
    // randomly select an element from the canvas and turn it white
    // if that one is already white, turn it black

    drawVideo();

    // draw the fragments
    drawFragments();

    // draw the aliens
    drawAliens();

    // now draw all the exploded pixels
    blend();

    // upate the score
    drawScore()
}

var score = 0;
var round = 0;
// we draw the score in the left bottom corner
function drawScore() {

        var toWrite = "";
        if (score < 10) {
            toWrite = "round:"+ Math.min(10,round) + "/10" + " points:" + score;
        } else {
            toWrite = "round:"+ Math.min(10,round) + "/10" + " points:" + score;
        }
        testWriteAscii(toWrite,0,nY-8);

        $("#round").text("Round: " + round + "/10");
        $("#score").text("Score: " + score);
}

// Draw all the aliens, wait 5 seconds (100 iterations)
var waitPeriod=100;
function drawAliens() {

    // if we don't have any aliens draw 20

    if (aliens.length == 0 && waitPeriod%150 == 0) {
        // determine the first highlighted one
        var highlight = Math.round(Math.random()*(18-1));
        var count = 0;

        for (var y = 0 ; y < 2 ; y++ ) {
            for (var x = 0 ; x < 9 ; x++) {
                var type = Math.round(Math.random()*(invaders.length-1));
                var alien = {
                    x: ((x)*13)+6, // xOffset alien
                    y: (y+1)*10, // yOffset alien
                    type: type, // based on array
                    active: false, // if true different color
                    fragments: [] // positions where this alien is drawn
                }


                if (count == highlight) {
                    alien.active = true;
                }
                aliens.push(alien);
                count++;
            }
        }
        waitPeriod = 0;
        round++;
    }
    waitPeriod++;

    // we have aliens, so draw them
    for (var i = 0 ; i < aliens.length ; i++) {
        drawAlien(aliens[i]);
    }
}

function drawAlien(alien) {

    var ledChar = invaders[alien.type];
    for (var i = 0; i < invaders[alien.type].length; i++) {
            for (var j = 8; j >= 0; j--) {
                var state = ((ledChar[i] & (1 << j)) != 0);
                bullets[ALIEN][i + alien.x][alien.y -j]=state;
                if (alien.active && state==1) {
                    setStateDirect(i + alien.x,  alien.y -j, 2);
                } else {
                    setStateDirect(i + alien.x,  alien.y -j, state);
                }
            }
    }
}

function drawFragments() {
    for (var i = 0 ; i < fragments.length ; i++) {
        var currentFragment = fragments.shift();

        // move the current fragment
        var newX=currentFragment.x+(currentFragment.directionX*currentFragment.velocity);
        var newY=currentFragment.y+(currentFragment.directionY*currentFragment.velocity);

        // write the current position as black
        setStateDirect(currentFragment.x,currentFragment.y,0);

        // if the new position is within bounds write it
        if (newX <=nX && newX>=0 && newY >=0 && newY <= nY) {
            setStateDirect(newX,newY,1);
            currentFragment.x = newX;
            currentFragment.y = newY;

            // and push it back on the array
            fragments.push(currentFragment);
        }
    }
}

function setStateDirect(x, y, state) {
    var color = {};
    if (state == 0) {
        color = "#000";
    } else if (state == 1) {
        color = "#fff";
    } else if (state == 2) {
        color = "#7C96F3";
    }
    drawCircle(x * (circleWidth) + drawOffset, y * (circleWidth) + drawOffset, radius - 1, linewidth, color, color);
}

function setState(x, y, state, source, force) {
    var color = {};
    if (state == 0) {
        color = "#000";
    } else {
        color = "#7000AC";
    }

    // only draw something when the current state of this source is changed.
    if (bullets[source][x][y] != state || bullets[source][x][y] == null || force) {
        drawCircle(x * (circleWidth) + drawOffset, y * (circleWidth) + drawOffset, radius - 1, linewidth, color, color);
        bullets[source][x][y] = state;
    }
}

function fillCanvas() {
    for (var x = 0; x < nX; x++) {
        for (var y = 0; y < nY; y++) {
            setState(x, y, 0, 0);
        }
    }
}

function drawCircle(x, y, radius, lineWidth, fillColor, borderColor) {
    context.beginPath();
    context.rect(x, y, 2 * radius + 1, 2 * radius + 1);
    context.fillStyle = fillColor;
    context.closePath();
    context.fill();

}
