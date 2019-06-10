//chrome.exe --disable-web-security --user-data-dir="C:\Users\ASHISH\Dropbox\Terrain Project"
// GOOGLE MAP ENDS - 2D CANVAS
// Uses - 1. googlemap-handler.js
// 2. googlemap-pixel-distance.js
var canvas = document.getElementById('canvasID');
if (canvas == null)
    alert("No canvas object found!");
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
// Adds ctx.getTransform() - returns an SVGMatrix
// Adds ctx.transformedPoint(x,y) - returns an SVGPoint
function trackTransforms(ctx) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    var xform = svg.createSVGMatrix();
    ctx.getTransform = function () {
        return xform;
    };

    var savedTransforms = [];
    var save = ctx.save;
    ctx.save = function () {
        savedTransforms.push(xform.translate(0, 0));
        return save.call(ctx);
    };

    var restore = ctx.restore;
    ctx.restore = function () {
        xform = savedTransforms.pop();
        return restore.call(ctx);
    };

    var scale = ctx.scale;
    ctx.scale = function (sx, sy) {
        xform = xform.scaleNonUniform(sx, sy);
        return scale.call(ctx, sx, sy);
    };

    var rotate = ctx.rotate;
    ctx.rotate = function (radians) {
        xform = xform.rotate(radians * 180 / Math.PI);
        return rotate.call(ctx, radians);
    };

    var translate = ctx.translate;
    ctx.translate = function (dx, dy) {
        xform = xform.translate(dx, dy);
        return translate.call(ctx, dx, dy);
    };

    var transform = ctx.transform;
    ctx.transform = function (a, b, c, d, e, f) {
        var m2 = svg.createSVGMatrix();
        m2.a = a;
        m2.b = b;
        m2.c = c;
        m2.d = d;
        m2.e = e;
        m2.f = f;
        xform = xform.multiply(m2);
        return transform.call(ctx, a, b, c, d, e, f);
    };

    var setTransform = ctx.setTransform;
    ctx.setTransform = function (a, b, c, d, e, f) {
        xform.a = a;
        xform.b = b;
        xform.c = c;
        xform.d = d;
        xform.e = e;
        xform.f = f;
        return setTransform.call(ctx, a, b, c, d, e, f);
    };

    var pt = svg.createSVGPoint();
    ctx.transformedPoint = function (x, y) {
        pt.x = x;
        pt.y = y;
        return pt.matrixTransform(xform.inverse());
    }
}


// Image Manipulation

// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Last update December 2011
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Constructor for Shape objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
function Shape(x, y, w, h, fill, selectionOrder, alpha) {
    // This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
    // "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
    // But we aren't checking anything else! We could put "Lalala" for the value of x 
    this.x = x || 0;
    this.y = y || 0;
    this.w = w || 1;
    this.h = h || 1;
    this.fill = fill || '#AAAAAA';
    this.selectionOrder = selectionOrder || 1;
    this.alpha = alpha || 1.0;
    this.realWidth = w; // Realworld width in meters.
    this.realHeight = h; // Realworld height in meters.
    this.rotateRadAngle = 0.0;
}

// Draws this shape to a given context
Shape.prototype.draw = function (ctx) {
    //ctx.fillStyle = "blue";
    //ctx.fillRect(this.x, this.y, this.w, this.h);
    if (this.markedForDelete === true) // do nothing if marked for delete.
        return;

    var loc_x = this.x;
    var loc_y = this.y;
    var width = this.w;
    var height = this.h;

    var imageObj = new Image();
    imageObj.src = this.fill;
    var alph = this.alpha;
    var angle = this.rotateRadAngle;

    imageObj.onload = function () {
        ctx.globalAlpha = alph;

        // In case of rotation. 
        // 1. save the current canvas state. (Doesn't include images on it) 
        // 2. Take the canvas 0, 0 to the image midpoint.
        // 3. Rotate the canvas.
        // 4. Draw the image. at its 0,0. It should be rotated.
        // 5. Restore the canvas.
        ctx.save();
        // loc_x and loc_y are the upper left corner of the image. So shift the canvas to image's center.
        ctx.translate(loc_x + width / 2, loc_y + height / 2);
        ctx.rotate(angle);
        // since we need to keep the incomning location, compensate for the first translate while adding the image back.
        ctx.drawImage(imageObj, -width / 2, -height / 2, width, height);

        ctx.restore();
    };
}

// Determine if a point is inside the shape's bounds
Shape.prototype.contains = function (mx, my) {
    if (this.markedForDelete === true) // do nothing if marked for delete.
        return false;
    // All we have to do is make sure the Mouse X,Y fall in the area between
    // the shape's X and (X + Width) and its Y and (Y + Height)
    return (this.x <= mx) && (this.x + this.w >= mx) &&
        (this.y <= my) && (this.y + this.h >= my);
}

Shape.prototype.toBitmap = function () {

    var tcanvas = document.createElement('canvas'), /// create temp canvas
        tctx = tcanvas.getContext('2d'); /// temp context

    tcanvas.width = this.w; /// set width = shape width
    tcanvas.height = this.h;
    tctx.translate(-this.x, -this.y); /// make sure shape is drawn at origin

    this.draw(tctx); /// render itself to temp context

    return tcanvas.toDataURL(); /// return image (or use getImageData)
}

function CanvasState(canvas) {
    // **** First some setup! ****

    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;

    //this.width = 1200;
    //this.height = 800;

    this.ctx = canvas.getContext('2d');

    // This complicates things a little but but fixes mouse co-ordinate problems
    // when there's a border or padding. See getMouse for more detail
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if (document.defaultView && document.defaultView.getComputedStyle) {
        this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10) || 0;
        this.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10) || 0;
        this.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
        this.styleBorderTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10) || 0;
    }
    // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
    // They will mess up mouse coordinates and this fixes that
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;

    // **** Keep track of state! ****

    this.valid = false; // when set to false, the canvas will redraw everything
    this.shapes = []; // the collection of things to be drawn
    this.dragging = false; // Keep track of when we are dragging
    // the current selected object. In the future we could turn this into an array for multiple selection
    this.selection = null;
    this.dragoffx = 0; // See mousedown and mousemove events for explanation
    this.dragoffy = 0;

    this.zoomFactor = 1.0;

    // **** Then events! ****

    // This is an example of a closure!
    // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
    // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
    // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
    // This is our reference!
    var myState = this;

    //fixes a problem where double clicking causes text to get selected on the canvas
    canvas.addEventListener('selectstart', function (e) {
        e.preventDefault();
        return false;
    }, false);

    myState.panStart = null; // used for panning the canvas.

    // Up, down, and move are for dragging
    canvas.addEventListener('mousedown', function (e) {
        var mouse = myState.getMouse(e);
        var mx = mouse.x;
        var my = mouse.y;
        var shapes = myState.shapes;
        var l = shapes.length;

        var temp_selectionOrder = 100; // something too big. Initial value.
        var ifSelected = false;
        for (var i = l - 1; i >= 0; i--) {
            if (shapes[i].contains(mx, my)) {
                var mySel = shapes[i];

                // This is to make sure that higher priority objects gets selected over lower priority.
                if (temp_selectionOrder > mySel.selectionOrder) {
                    temp_selectionOrder = mySel.selectionOrder;
                    // Keep track of where in the object we clicked
                    // so we can move it smoothly (see mousemove)
                    myState.dragoffx = mx - mySel.x;
                    myState.dragoffy = my - mySel.y;
                    myState.dragging = true;
                    myState.selection = mySel;
                    myState.valid = false;
                    ifSelected = true;
                }
            }
        }

        // if someting is selected, return.
        if (ifSelected)
            return;

        // havent returned means we have failed to select anything.
        // If there was an object selected, we deselect it
        if (myState.selection) {
            myState.selection = null;
            myState.valid = false; // Need to clear the old selection border
        }

        // We reach this point without returning means, there is no selection.
        // It's a click on empty area and time to pan, maybe..
        myState.panStart = mouse;

    }, true);

    myState.startRotate = false;
    myState.startMove = true; // Move on drag for the time being.

    // Note: It's not on canvas but on the document.
    document.addEventListener('keydown', function (e) {

        var commandInputElem = document.getElementById("commandPromp");
        // check for focus
        var isFocused = (document.activeElement === commandInputElem);
        if (isFocused === false) {
            //alert("KeyDown");
            commandInputElem.focus();
        }
        else if (isFocused && e.keyCode == 13) // if enter
        {
            // check the content of commandInputElem
            if (commandInputElem.value === 'm' || commandInputElem.value === 'move') {
                // myState.startMove = true;
                // console.log("Time to move object");
            }
            if (commandInputElem.value === 'r' || commandInputElem.value === 'rotate') {
                console.log("Time to rotate object");
                myState.startRotate = true;
            }
            if (commandInputElem.value === 'd' || commandInputElem.value === 'delete') {
                if (myState.selection) {
                    console.log("Delete the selected object.");
                    myState.selection.markedForDelete = true;
                    myState.selection = null;
                    myState.valid = false; // force redraw.
                }
                else
                    console.log("Nothing selected to delete.");
            }
            commandInputElem.value = "";
        }

        if (e.keyCode == 46) // if delete
        {
            if (myState.selection) {
                console.log("Delete the selected object.");
                myState.selection.markedForDelete = true;
                myState.selection = null;
                myState.valid = false; // force redraw.
            }
            else
                console.log("Nothing selected to delete.");
        }
    });


    canvas.addEventListener('mousemove', function (e) {
        var mouse = myState.getMouse(e);
        if (myState.dragging && myState.startMove == true) {
            // We don't want to drag the object by its top-left corner, we want to drag it
            // from where we clicked. Thats why we saved the offset and use it here
            myState.selection.x = mouse.x - myState.dragoffx;
            myState.selection.y = mouse.y - myState.dragoffy;
            myState.valid = false; // Something's dragging so we must redraw   

        } else if (myState.panStart != null) {
            pan(e);
            myState.panStart = mouse;
        }
        else if (myState.selection != null && myState.startRotate == true) {
            // Rotate selection Test. 
            var dx = mouse.x - myState.selection.x;
            var dy = mouse.y - myState.selection.y;
            var radianAngle = Math.atan2(dy, dx);
            myState.selection.rotateRadAngle = radianAngle;

            // //<< Debug
            // console.log("Angle: " + radianAngle);
            // console.log("mouse.x: " + mouse.x);
            // console.log("mouse.y: " + mouse.y);
            // console.log("myState.dragoffx: " + myState.selection.x);
            // console.log("myState.dragoffy: " + myState.selection.x);
            // console.log("****************");
            // //<< Debug

            myState.valid = false;
        }
    }, true);


    canvas.addEventListener('mouseup', function (e) {
        myState.dragging = false;
        myState.panStart = null;
        myState.startRotate = false;
        myState.startMove = true;
        console.log("reset all transformation flags");
    }, true);


    // double click for making new shapes
    canvas.addEventListener('dblclick', function (e) {
        var mouse = myState.getMouse(e);
        //myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, 20, 20, 'rgba(0,255,0,.6)'));
    }, true);

    canvas.addEventListener('drop', function (ev) {
        ev.preventDefault();
        var data = JSON.parse(ev.dataTransfer.getData("source"));

        // Taking into account the Google map.
        var mapFactor = 1.0;
        //var pixelDist = getRadiusInPixels(map, 100);
        //mapFactor = pixelDist / 100;

        // Add this data on canvas    
        var mouse = myState.getMouse(ev);
        // take care of the current zoomfactor factor.
        var w = myState.zoomFactor * data.width * mapFactor;
        var h = myState.zoomFactor * data.height * mapFactor;

        myState.addShape(new Shape(mouse.x - w * 0.5, mouse.y - h * 0.5, w, h, data.file, data.selectionOrder));

        //alert(data);
    });

    // Zoom
    trackTransforms(this.ctx);

    // // Zoom at the center of the drawing.
    // var zoom = function(delta, e) {
    //     var scaleFactor = 1.25;

    //     var lastX = canvas.width / 2,
    //         lastY = canvas.height / 2;
    //     var ctx = canvas.getContext('2d');

    //     var pt = ctx.transformedPoint(lastX, lastY);
    //     // ctx.translate(pt.x, pt.y);
    //     factor = Math.pow(scaleFactor, delta);
    //     //ctx.scale(factor, factor);
    //    //ctx.translate(-pt.x, -pt.y);

    //    // Store this for other purposes.
    //    myState.zoomFactor = factor*myState.zoomFactor;


    //     // trial
    //       // draw all shapes
    //     var shapes = myState.shapes;
    //     var l = shapes.length;
    //     for (var i = 0; i < l; i++) {
    //         var shape = shapes[i];
    //         shape.w = shape.w * factor;
    //         shape.h = shape.h * factor;

    //         // This is to zoom at the mouse location.
    //         shape.x = shape.x - pt.x;
    //         shape.y = shape.y - pt.y;

    //         shape.x = shape.x * factor;
    //         shape.y = shape.y * factor;

    //         shape.x = shape.x + pt.x;
    //         shape.y = shape.y + pt.y;
    //     }          
    //     myState.valid = false;
    //     //redraw();
    // }

    // var lastPixelDist = 1;
    // //Zoom at the mouse position. Accoring to Map zoom.
    // var zoom = function(delta, e) {

    //     var mouse = myState.getMouse(e);

    //     var lastX = mouse.x,
    //         lastY = mouse.y;
    //     var ctx = canvas.getContext('2d');

    //     var pt = ctx.transformedPoint(lastX, lastY);

    //     // Normal case.
    //     // factor = Math.pow(scaleFactor, delta);
    //     // In case we are finding real distace.
    //     // 100 meters is pixelDist at this zoom level.
    //     var pixelDist = getRadiusInPixels(map, 100);
    //     factor = pixelDist/100; // 1 meter is how much.

    //     if(pixelDist == lastPixelDist)
    //     {
    //       return;
    //     }

    //     lastPixelDist = pixelDist;

    //    // Store this for other purposes.
    //    // myState.zoomFactor = factor*myState.zoomFactor;

    //     // trial
    //     // draw all shapes
    //     var shapes = myState.shapes;
    //     var l = shapes.length;
    //     for (var i = 0; i < l; i++) {
    //         var shape = shapes[i];
    //         shape.w = shape.realWidth * factor;
    //         shape.h = shape.realHeight * factor;

    //         // This is to zoom at the mouse location.
    //         shape.x = shape.x - pt.x;
    //         shape.y = shape.y - pt.y;

    //         shape.x = shape.x * factor;
    //         shape.y = shape.y * factor;

    //         shape.x = shape.x + pt.x;
    //         shape.y = shape.y + pt.y;
    //     }          
    //     myState.valid = false;
    // }

    //Zoom at the mouse position.
    var zoom = function (delta, e) {

        var scaleFactor = 1.05;
        var mouse = myState.getMouse(e);

        var lastX = mouse.x,
            lastY = mouse.y;
        var ctx = canvas.getContext('2d');

        var pt = ctx.transformedPoint(lastX, lastY);

        // Normal case.
        factor = Math.pow(scaleFactor, delta);
        // // In case we are finding real distace.
        // // 100 meters is pixelDist at this zoom level.
        // var pixelDist = getRadiusInPixels(map, 100);
        // factor = pixelDist/100; // 1 meter is how much.

        // Store this for other purposes.
        myState.zoomFactor = factor * myState.zoomFactor;

        // trial
        // draw all shapes
        var shapes = myState.shapes;
        var l = shapes.length;
        for (var i = 0; i < l; i++) {
            var shape = shapes[i];
            shape.w = shape.w * factor;
            shape.h = shape.h * factor;

            // This is to zoom at the mouse location.
            shape.x = shape.x - pt.x;
            shape.y = shape.y - pt.y;

            shape.x = shape.x * factor;
            shape.y = shape.y * factor;

            shape.x = shape.x + pt.x;
            shape.y = shape.y + pt.y;
        }
        myState.valid = false;
        //redraw();
    }

    //Zoom at the mouse position.
    var pan = function (e) {
        console.log("In pan");
        var mouse = myState.getMouse(e);

        var lastX = mouse.x,
            lastY = mouse.y;
        var ctx = canvas.getContext('2d');

        var pt = ctx.transformedPoint(lastX, lastY);

        // draw all shapes
        var shapes = myState.shapes;
        var l = shapes.length;
        for (var i = 0; i < l; i++) {
            var shape = shapes[i];

            // This is to zoom at the mouse location.
            shape.x = shape.x + (pt.x - myState.panStart.x);
            shape.y = shape.y + (pt.y - myState.panStart.y);
        }
        myState.valid = false;
    }

    var handleScroll = function (evt) {
        var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
        if (delta) zoom(delta, evt);
        return evt.preventDefault() && false;
    };

    canvas.addEventListener('DOMMouseScroll', handleScroll, false);
    canvas.addEventListener('mousewheel', handleScroll, false);

    // //For Google Map.
    // canvas.addEventListener('DOMMouseScroll', fx, false);
    // canvas.addEventListener('mousewheel', fx, false);

    // **** Options! ****

    this.selectionColor = '#CC0000';
    this.selectionWidth = 2;
    this.interval = 30;
    setInterval(function () {
        myState.draw();
    }, myState.interval);
}

CanvasState.prototype.addShape = function (shape) {
    this.shapes.push(shape);
    this.valid = false;
}

CanvasState.prototype.clear = function () {
    this.ctx.clearRect(0, 0, this.width, this.height);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function () {
    // if our state is invalid, redraw and validate!
    if (!this.valid) {
        var ctx = this.ctx;
        var shapes = this.shapes;
        this.clear();

        //this.ctx.fillStyle = "blue";
        //this.ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ** Add stuff you want drawn in the background all the time here **
        // draw all shapes
        var l = shapes.length;
        for (var i = 0; i < l; i++) {
            var shape = shapes[i];
            // We can skip the drawing of elements that have moved off the screen:
            if (shape.x > this.width || shape.y > this.height ||
                shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
            shape.draw(ctx);
        }

        // draw selection
        // right now this is just a stroke along the edge of the selected Shape
        if (this.selection != null) {

            // for shadow
            ctx.strokeStyle = 'rgba(0,0,0,0.05)';
            ctx.lineWidth = 6;
            var mySel = this.selection;
            ctx.strokeRect(mySel.x, mySel.y, mySel.w + 4, mySel.h + 4);

            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 4;
            ctx.strokeRect(mySel.x, mySel.y, mySel.w + 2, mySel.h + 2);
            // 

            ctx.strokeStyle = this.selectionColor;
            ctx.lineWidth = this.selectionWidth;
            ctx.strokeRect(mySel.x, mySel.y, mySel.w, mySel.h);
        }

        // ** Add stuff you want drawn on top all the time here **

        this.valid = true;
    }
}


// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function (e) {
    var element = this.canvas,
        offsetX = 0,
        offsetY = 0,
        mx, my;

    // Compute the total offset
    if (element.offsetParent !== undefined) {
        do {
            offsetX += element.offsetLeft;
            offsetY += element.offsetTop;
        } while ((element = element.offsetParent));
    }

    // Add padding and border style widths to offset
    // Also add the <html> offsets in case there's a position:fixed bar
    offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
    offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

    mx = e.pageX - offsetX;
    my = e.pageY - offsetY;

    // We return a simple javascript object (a hash) with x and y defined
    return {
        x: mx,
        y: my
    };
}

function initDrawingCanvas() {
    var drawing_canvas = document.getElementById('canvasID');
    var s = new CanvasState(drawing_canvas);

    //s.addShape(new Shape(40, 40, 200, 200, './Turbine2.svg'));
    //s.addShape(new Shape(100, 150, 200, 200, './GSUT.svg'));
}

// Now go make something amazing!

// Drag drop.
function drag(ev) {
    var comp_data = ComponentDB.getComponentData(ev.target.name);
    comp_data.file = ev.target.src;
    ev.dataTransfer.setData("source", JSON.stringify(comp_data));
}

function allowDrop(ev) {
    ev.preventDefault();
}

// https://www.codeproject.com/Tips/201899/String-Format-in-JavaScript
// This is the function.
String.prototype.format = function (args) {
    var str = this;
    return str.replace(String.prototype.format.regex, function (item) {
        var intVal = parseInt(item.substring(1, item.length - 1));
        var replace;
        if (intVal >= 0) {
            replace = args[intVal];
        } else if (intVal === -1) {
            replace = "{";
        } else if (intVal === -2) {
            replace = "}";
        } else {
            replace = "";
        }
        return replace;
    });
};