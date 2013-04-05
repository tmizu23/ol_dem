var otm = new Object();
otm.Tile = new Object();

otm.Tile.DEM = OpenLayers.Class(OpenLayers.Tile, {

    url: null,
    imgDiv: null,
    frame: null,
    imageReloadAttempts: null,
    layerAlphaHack: null,
    asyncRequestId: null,
    blankImageUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAQAIBRAA7",
    maxGetUrlLength: null,
    canvasContext: null,
    crossOriginKeyword: null,


    initialize: function (layer, position, bounds, url, size, options) {
        OpenLayers.Tile.prototype.initialize.apply(this, arguments);

        this.url = url; //deprecated remove me

        this.layerAlphaHack = this.layer.alpha && OpenLayers.Util.alphaHack();

        if (this.maxGetUrlLength != null || this.layer.gutter || this.layerAlphaHack) {
            // only create frame if it's needed
            this.frame = document.createElement("div");
            this.frame.style.position = "absolute";
            this.frame.style.overflow = "hidden";
        }
        if (this.maxGetUrlLength != null) {
            OpenLayers.Util.extend(this, OpenLayers.Tile.Image.IFrame);
        }
    },

    /** 
     * APIMethod: destroy
     * nullify references to prevent circular references and memory leaks
     */
    destroy: function () {
        if (this.imgDiv) {
            this.clear();
            this.imgDiv = null;
            this.frame = null;
        }
        // don't handle async requests any more
        this.asyncRequestId = null;
        OpenLayers.Tile.prototype.destroy.apply(this, arguments);
    },

    /**
     * Method: draw
     * Check that a tile should be drawn, and draw it.
     * 
     * Returns:
     * {Boolean} Was a tile drawn?
     */
    draw: function () {
        var drawn = OpenLayers.Tile.prototype.draw.apply(this, arguments);
        if (drawn) {
            // The layer's reproject option is deprecated.
            if (this.layer != this.layer.map.baseLayer && this.layer.reproject) {
                // getBoundsFromBaseLayer is defined in deprecated.js.
                this.bounds = this.getBoundsFromBaseLayer(this.position);
            }
            if (this.isLoading) {
                //if we're already loading, send 'reload' instead of 'loadstart'.
                this._loadEvent = "reload";
            } else {
                this.isLoading = true;
                this._loadEvent = "loadstart";
            }
            this.url = this.layer.getURL(this.bounds);
            this.request = OpenLayers.Request.GET({
                url: this.url,
                callback: function (response) {
                    this.isLoading = false;
                    this.events.triggerEvent("loadend");
                    if (response.status === 200) {
                        this.parseData(response.responseText);
                        this.positionTile();
                        this.renderTile();
                        return drawn;
                    }
                },
                scope: this
            });

        } else {
            this.unload();
        }

    },
    parseData: function (str) {
        str = str.replace(/\r\n/g, "\n"); //IE対策 改行コード\r\nを\rに変換
        var lines = str.split(/\n/);
        this.data = [];
        for (var i = 0; i < lines.length; i++) {
            var elev = lines[i].split(/,/);
            this.data[i] = [];
            for (var j = 0; j < elev.length; j++) {
                this.data[i][j] = {};
                this.data[i][j].elevation = elev[j];
            }
        }
    },
    /**
     * Method: renderTile
     * Internal function to actually initialize the image tile,
     *     position it correctly, and set its url.
     */

    renderTile: function () {
        this.layer.div.appendChild(this.getTile());
        if (this.layer.async) {
            // Asynchronous image requests call the asynchronous getURL method
            // on the layer to fetch an image that covers 'this.bounds'.
            var id = this.asyncRequestId = (this.asyncRequestId || 0) + 1;
            this.layer.getURLasync(this.bounds, function (url) {
                if (id == this.asyncRequestId) {
                    this.url = url;
                    this.initImage();
                }
            }, this);
        } else {
            // synchronous image requests get the url immediately.
            this.url = this.getURL(this.bounds);
            this.initImage();

        }
    },
    getURL: function (bounds) {

        var ctx = this.getCanvasContext();
        var imageData = ctx.createImageData(256, 256);
        var idata = imageData.data;

        var z = 1.2;
        var ewres = 10;
        var nsres = 10;
        var radiansToDegrees = 180.0 / 3.14159;
        var degreesToRadians = 3.14159 / 180.0;
        var alt = 45.0;
        var az = 225.0;

        for (var i = 1; i < 255; ++i) {
            for (var j = 1; j < 255; ++j) {
                var win = [];
                win[1] = this.data[i - 1][j].elevation;
                win[3] = this.data[i][j - 1].elevation;
                win[5] = this.data[i][j + 1].elevation;
                win[7] = this.data[i + 1][j].elevation;

                var dx = (win[3] - win[5]) / ewres;
                var dy = (win[7] - win[1]) / nsres;
                var xx_plus_yy = dx * dx + dy * dy;
                this.data[i][j].slope = (Math.atan(Math.sqrt(xx_plus_yy) / 2) * radiansToDegrees).toFixed(1);
                var aspect = Math.atan2(dy, dx) / degreesToRadians;
                if (dx == 0 && dy == 0) {
                    aspect = null;
                } else if (aspect > 90.0) {
                    aspect = 450.0 - aspect;
                } else {
                    aspect = 90.0 - aspect;
                }
                if (aspect == 360.0) aspect = 0.0;
                this.data[i][j].aspect = aspect;

                if (this.layer.shade) {
                    var cang = (Math.sin(alt * degreesToRadians) - Math.cos(alt * degreesToRadians) * z / 2.0 * Math.sqrt(xx_plus_yy) *
                        Math.sin(Math.atan2(dy, dx) - az * degreesToRadians)) / Math.sqrt(1 + (z / 2.0 * z / 2.0) * xx_plus_yy);

                    if (cang <= 0.0) {
                        cang = 1.0;
                    } else {
                        cang = 1.0 + (254.0 * cang);
                    }
                    idata[i * 256 * 4 + j * 4] = cang;
                    idata[i * 256 * 4 + j * 4 + 1] = cang;
                    idata[i * 256 * 4 + j * 4 + 2] = cang;
                    idata[i * 256 * 4 + j * 4 + 3] = 255;
                }
            }
        }
        if (this.layer.shade) {
            //境界線は1px内側のデータと同じにする
            for (var i = 1; i < 255; ++i) {
                idata[i * 256 * 4] = idata[i * 256 * 4 + 4];
                idata[i * 256 * 4 + 1] = idata[i * 256 * 4 + 5];
                idata[i * 256 * 4 + 2] = idata[i * 256 * 4 + 6];
                idata[i * 256 * 4 + 3] = idata[i * 256 * 4 + 7];
                idata[(i + 1) * 256 * 4 - 4] = idata[(i + 1) * 256 * 4 - 8];
                idata[(i + 1) * 256 * 4 - 3] = idata[(i + 1) * 256 * 4 - 7];
                idata[(i + 1) * 256 * 4 - 2] = idata[(i + 1) * 256 * 4 - 6];
                idata[(i + 1) * 256 * 4 - 1] = idata[(i + 1) * 256 * 4 - 5];
            }
            for (var j = 0; j < 256; ++j) {
                idata[j * 4] = idata[256 * 4 + j * 4];
                idata[j * 4 + 1] = idata[256 * 4 + j * 4 + 1];
                idata[j * 4 + 2] = idata[256 * 4 + j * 4 + 2];
                idata[j * 4 + 3] = idata[256 * 4 + j * 4 + 3];
                idata[255 * 256 * 4 + j * 4] = idata[254 * 256 * 4 + j * 4];
                idata[255 * 256 * 4 + j * 4 + 1] = idata[254 * 256 * 4 + j * 4 + 1];
                idata[255 * 256 * 4 + j * 4 + 2] = idata[254 * 256 * 4 + j * 4 + 2];
                idata[255 * 256 * 4 + j * 4 + 3] = idata[254 * 256 * 4 + j * 4 + 3];
            }

            ctx.putImageData(imageData, 0, 0);
            return ctx.canvas.toDataURL();
        } else {
            return null;
        }

    },
    /**
     * Method: positionTile
     * Using the properties currenty set on the layer, position the tile correctly.
     * This method is used both by the async and non-async versions of the Tile.Image
     * code.
     */
    positionTile: function () {
        var style = this.getTile().style,
            size = this.frame ? this.size :
                this.layer.getImageSize(this.bounds);
        style.left = this.position.x + "%";
        style.top = this.position.y + "%";
        style.width = size.w + "%";
        style.height = size.h + "%";
    },

    /** 
     * Method: clear
     * Remove the tile from the DOM, clear it of any image related data so that
     * it can be reused in a new location.
     */
    clear: function () {
        OpenLayers.Tile.prototype.clear.apply(this, arguments);
        var img = this.imgDiv;
        if (img) {
            OpenLayers.Event.stopObservingElement(img);
            var tile = this.getTile();
            if (tile.parentNode === this.layer.div) {
                this.layer.div.removeChild(tile);
            }
            this.setImgSrc();
            if (this.layerAlphaHack === true) {
                img.style.filter = "";
            }
            OpenLayers.Element.removeClass(img, "olImageLoadError");
        }
        this.canvasContext = null;
    },

    /**
     * Method: getImage
     * Returns or creates and returns the tile image.
     */
    getImage: function () {
        if (!this.imgDiv) {
            this.imgDiv = document.createElement("img");

            this.imgDiv.className = "olTileImage";
            // avoid image gallery menu in IE6
            this.imgDiv.galleryImg = "no";

            var style = this.imgDiv.style;
            if (this.frame) {
                var left = 0,
                    top = 0;
                if (this.layer.gutter) {
                    left = this.layer.gutter / this.layer.tileSize.w * 100;
                    top = this.layer.gutter / this.layer.tileSize.h * 100;
                }
                style.left = -left + "%";
                style.top = -top + "%";
                style.width = (2 * left + 100) + "%";
                style.height = (2 * top + 100) + "%";
            }
            style.visibility = "hidden";
            style.opacity = 0;
            if (this.layer.opacity < 1) {
                style.filter = 'alpha(opacity=' +
                    (this.layer.opacity * 100) +
                    ')';
            }
            style.position = "absolute";
            if (this.layerAlphaHack) {
                // move the image out of sight
                style.paddingTop = style.height;
                style.height = "0";
                style.width = "100%";
            }
            if (this.frame) {
                this.frame.appendChild(this.imgDiv);
            }
        }

        return this.imgDiv;
    },

    /**
     * Method: initImage
     * Creates the content for the frame on the tile.
     */
    initImage: function () {
        this.events.triggerEvent(this._loadEvent);
        var img = this.getImage();
        if (this.url && img.getAttribute("src") == this.url) {
            this.onImageLoad();
        } else {
            // We need to start with a blank image, to make sure that no
            // loading image placeholder and no old image is displayed when we
            // set the display style to "" in onImageLoad, which is called
            // after the image is loaded, but before it is rendered. So we set
            // a blank image with a data scheme URI, and register for the load
            // event (for browsers that support data scheme) and the error
            // event (for browsers that don't). In the event handler, we set
            // the final src.
            var load = OpenLayers.Function.bind(function () {
                OpenLayers.Event.stopObservingElement(img);
                OpenLayers.Event.observe(img, "load",
                    OpenLayers.Function.bind(this.onImageLoad, this));
                OpenLayers.Event.observe(img, "error",
                    OpenLayers.Function.bind(this.onImageError, this));
                this.imageReloadAttempts = 0;
                this.setImgSrc(this.url);
            }, this);
            if (img.getAttribute("src") == this.blankImageUrl) {
                load();
            } else {
                OpenLayers.Event.observe(img, "load", load);
                OpenLayers.Event.observe(img, "error", load);
                if (this.crossOriginKeyword) {
                    img.removeAttribute("crossorigin");
                }
                img.src = this.blankImageUrl;
            }
        }
    },

    /**
     * Method: setImgSrc
     * Sets the source for the tile image
     *
     * Parameters:
     * url - {String} or undefined to hide the image
     */
    setImgSrc: function (url) {
        var img = this.imgDiv;
        img.style.visibility = 'hidden';
        img.style.opacity = 0;
        if (url) {
            // don't set crossOrigin if the url is a data URL
            if (this.crossOriginKeyword) {
                if (url.substr(0, 5) !== 'data:') {
                    img.setAttribute("crossorigin", this.crossOriginKeyword);
                } else {
                    img.removeAttribute("crossorigin");
                }
            }
            img.src = url;
        }
    },

    /**
     * Method: getTile
     * Get the tile's markup.
     *
     * Returns:
     * {DOMElement} The tile's markup
     */
    getTile: function () {
        return this.frame ? this.frame : this.getImage();
    },

    /**
     * Method: createBackBuffer
     * Create a backbuffer for this tile. A backbuffer isn't exactly a clone
     * of the tile's markup, because we want to avoid the reloading of the
     * image. So we clone the frame, and steal the image from the tile.
     *
     * Returns:
     * {DOMElement} The markup, or undefined if the tile has no image
     * or if it's currently loading.
     */
    createBackBuffer: function () {
        if (!this.imgDiv || this.isLoading) {
            return;
        }
        var backBuffer;
        if (this.frame) {
            backBuffer = this.frame.cloneNode(false);
            backBuffer.appendChild(this.imgDiv);
        } else {
            backBuffer = this.imgDiv;
        }
        this.imgDiv = null;
        return backBuffer;
    },

    /**
     * Method: onImageLoad
     * Handler for the image onload event
     */
    onImageLoad: function () {
        var img = this.imgDiv;
        OpenLayers.Event.stopObservingElement(img);

        img.style.visibility = 'inherit';
        img.style.opacity = this.layer.opacity;

        this.isLoading = false;
        this.canvasContext = null;
        this.events.triggerEvent("loadend");

        // IE<7 needs a reflow when the tiles are loaded because of the
        // percentage based positioning. Otherwise nothing is shown
        // until the user interacts with the map in some way.
        if (parseFloat(navigator.appVersion.split("MSIE")[1]) < 7 &&
            this.layer && this.layer.div) {
            var span = document.createElement("span");
            span.style.display = "none";
            var layerDiv = this.layer.div;
            layerDiv.appendChild(span);
            window.setTimeout(function () {
                span.parentNode === layerDiv && span.parentNode.removeChild(span);
            }, 0);
        }

        if (this.layerAlphaHack === true) {
            img.style.filter =
                "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" +
                img.src + "', sizingMethod='scale')";
        }
    },

    /**
     * Method: onImageError
     * Handler for the image onerror event
     */
    onImageError: function () {
        var img = this.imgDiv;
        if (img.src != null) {
            this.imageReloadAttempts++;
            if (this.imageReloadAttempts <= OpenLayers.IMAGE_RELOAD_ATTEMPTS) {
                this.setImgSrc(this.layer.getURL(this.bounds));
            } else {
                OpenLayers.Element.addClass(img, "olImageLoadError");
                this.events.triggerEvent("loaderror");
                this.onImageLoad();
            }
        }
    },

    /**
     * APIMethod: getCanvasContext
     * Returns a canvas context associated with the tile image (with
     * the image drawn on it).
     * Returns undefined if the browser does not support canvas, if
     * the tile has no image or if it's currently loading.
     *
     * The function returns a canvas context instance but the
     * underlying canvas is still available in the 'canvas' property:
     * (code)
     * var context = tile.getCanvasContext();
     * if (context) {
     *     var data = context.canvas.toDataURL('image/jpeg');
     * }
     * (end)
     *
     * Returns:
     * {Boolean}
     */
    getCanvasContext: function () {
        if (OpenLayers.CANVAS_SUPPORTED && this.imgDiv && !this.isLoading) {
            if (!this.canvasContext) {
                var canvas = document.createElement("canvas");
                canvas.width = this.size.w;
                canvas.height = this.size.h;
                this.canvasContext = canvas.getContext("2d");
                this.canvasContext.drawImage(this.imgDiv, 0, 0);
            }
            return this.canvasContext;
        }
    },
    getFeatureInfo: function (i, j) {
        var info = null;
        if (this.data) {
            info = this.data[j][i];
        }
        return info;
    },

    CLASS_NAME: "otm.Tile.DEM"

});