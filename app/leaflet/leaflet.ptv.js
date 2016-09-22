/**
 @module L.PtvLayer
 **/
L.PtvLayer = L.PtvLayer || {};

/**
 Provides the PTV AbstractOverlay Layer class.
 @class L.PtvLayer.AbstractOverlay
 @extends L.ILayer
 @params {Object} options The options object
 @params {String} [options.format] The image format used in tile requests.
 @params {String} [options.beforeSend] Function to be called before sending the request with the request object given as first parameter. The (modified) request object must be returned.
 @constructor
 **/
L.PtvLayer.AbstractOverlay = L.Class.extend({
  includes: L.Mixin.Events,

  _el1: null,
  _el2: null,
  _elCur: 0,
  _client: null,
  _map: null,
  _requestObject: null,

  /**
   Default options used in this class.
   @property options
   @type Object
   **/
  options: {
    /**
     The image format used in tile requests.
     @property options.format
     @type String
     @default "PNG"
     **/
    format: 'PNG',
	
	/**
     Function to be called before sending the request with the request object given as first parameter. The (modified) request object must be returned.
     @property options.beforeSend
     @type function
     @default null
     **/
    beforeSend: null,

    /**
     The world bounds for PTV Maps.
     @property options.bounds
     @type L.LatLngBounds
     @default [[85.0, -178.965000], [-66.5, 178.965000]]
     **/
    bounds: new L.LatLngBounds([[85.0, -178.965000], [-66.5, 178.965000]]),

    /**
      The profile name of the text foreground layer 
      @property options.foregroundProfile
      @type String
      @default "ajax-fg" 
      **/
    foregroundProfile: 'ajax-fg',

    /**
      The profile name of text background layer
      @property options.backgroundProfile
      @type String
      @default "ajax-bg"
     **/
    backgroundProfile: 'ajax-bg'


  },

  /**
   Constructor
   @method L.PtvLayer.AbstractOverlay
   @param {XMapClient} client optional XMapClient object
   @param {Object} options optional options object
   **/
  initialize: function(client, options) {
    this._client = client;
    if (typeof client !== 'object' ) {
      if (typeof XMapClient !== 'function') {
        throw Error('The XMapClient object is not accessible globally. Have you loaded "xmap-client.js" properly?');
      } else {
        this._client = new XMapClient(null, 1);
      }
	}
    L.Util.setOptions(this, options);
  },

  onAdd: function(map) {
    this._map = map;

    // create a DOM element and put it into one of the map panes
    this._el1 = L.DomUtil.create('img', 'leaflet-tile leaflet-zoom-hide');
	this._el2 = L.DomUtil.create('img', 'leaflet-tile leaflet-zoom-hide');
	this._el1.style.cssText = '-webkit-transition: none; -moz-transition: none; -o-transition: opacity 0 linear; transition: none;';
	this._el2.style.cssText = '-webkit-transition: none; -moz-transition: none; -o-transition: opacity 0 linear; transition: none;';
    this._el1.onload = (function(self, el) { return function() { self._setActiveEl.call(self, el); }; })(this, this._el1);
	this._el2.onload = (function(self, el) { return function() { self._setActiveEl.call(self, el); }; })(this, this._el2);

    map.getPanes().overlayPane.appendChild(this._el1);
	map.getPanes().overlayPane.appendChild(this._el2);

    map.on({
      'moveend': this._update
    }, this);

    this._update();
  },

  onRemove: function(map) {
    map.off({
      'moveend': this._update
    }, this);

    map.getPanes().overlayPane.removeChild(this._el1);
	map.getPanes().overlayPane.removeChild(this._el2);
  },
  
  _setActiveEl: function(el) {
	if(el === this._el1) {
		L.DomUtil.addClass(this._el1, 'leaflet-tile-loaded');
		L.DomUtil.removeClass(this._el2, 'leaflet-tile-loaded');
	} else {
		L.DomUtil.addClass(this._el2, 'leaflet-tile-loaded');
		L.DomUtil.removeClass(this._el1, 'leaflet-tile-loaded');
	}
  },

  _update: function() {
    var bounds = this._map.getBounds(), mapSize = this._map.getSize(), el = (!this._elCur ? this._el1 : this._el2);
	this._elCur = (this._elCur + 1) % 2;
	
    if (this._map.getZoom() > this._map.getMaxZoom() || this._map.getZoom() < this._map.getMinZoom()) {
      return;
    }

    if (this.options.bounds) {
      bounds.clip(this.options.bounds);
    }

    if ( typeof this._client.cancelPendingRequests === 'function') {
      this._client.cancelPendingRequests();
    }

    var se = this._map.project(bounds.getSouthEast()), nw = this._map.project(bounds.getNorthWest());

    mapSize.x = Math.max(256, se.x - nw.x);
    mapSize.y = Math.max(256, se.y - nw.y);
    var tileUrl = this._requestTile(bounds, mapSize, el);

    var pos = this._map.latLngToLayerPoint(bounds.getNorthWest());
    L.DomUtil.setPosition(el, pos, false);
  },

  _getRequestObject: function() {
    return {
      mapSection: {
        leftTop: {
          "$type": "Point",
          point: {
            "$type": "PlainPoint",
            x: 0,
            y: 0
          }
        },
        rightBottom: {
          "$type": "Point",
          point: {
            "$type": "PlainPoint",
            x: 0,
            y: 0
          }
        }
      },
      mapParams: {
        showScale: false,
        useMiles: false
      },
      imageInfo: {
        format: '',
        width: 0,
        height: 0
      },
      layers: [],
      includeImageInResponse: true,
      callerContext: {
        properties: [{
          key: "Profile",
          value: ""
        }, {
          "key": "CoordFormat",
          "value": "OG_GEODECIMAL"
        }]
      }
    };
  },

  _requestTile: function(bounds, mapSize, el) {
    var self = this, map = this._map, crs = map.options.crs, nw = crs.project(bounds.getNorthWest()), se = crs.project(bounds.getSouthEast()), bbox = new L.LatLngBounds([se.y, nw.x], [nw.y, se.x]);

    var req = this._getRequestObject();
    req.mapSection.leftTop.point.x = bbox.getNorthWest().lng;
    req.mapSection.leftTop.point.y = bbox.getNorthWest().lat;
    req.mapSection.rightBottom.point.x = bbox.getSouthEast().lng;
    req.mapSection.rightBottom.point.y = bbox.getSouthEast().lat;
    req.imageInfo.format = this.options.format;
    req.imageInfo.width = mapSize.x;
    req.imageInfo.height = mapSize.y;
	
	if (typeof this.options.beforeSend === "function") {
		req = this.options.beforeSend(req);
	}

    this._client.renderMapBoundingBox(req.mapSection, req.mapParams, req.imageInfo, req.layers, req.includeImageInResponse, req.callerContext, (function(el) {
      return function(resp, error) {
        self._renderMapCallback.call(self, resp, error, el);
      };
    })(el));

    this.fire('loading');
  },

  _renderMapCallback: function(resp, error, el) {
    if (!error) {
      el.src = L.PtvUtils.createDataURI(resp.image.rawImage);
    } else {
      el.src = L.Util.emptyImageUrl;
      console.log(error.errorMessage);
    }
	
    this.fire('load', {
      tile: el,
      url: el.src
    });
  }
});

/**
 @module L.PtvLayer
 **/
L.PtvLayer = L.PtvLayer || {};

/**
 Provides the PTV Background TileLayer class.
 @class L.PtvLayer.Background
 @extends L.TileLayer
 @params {XMapClient} client XMapClient object
 @params {Object} options The options object
 @params {String} [options.format] The image format used in tile requests.
 @params {String} [options.beforeSend] Function to be called before sending the request with the request object given as first parameter. The (modified) request object must be returned.
 @params {String} [options.errorTileUrl] The image to display when requests fail.
 @constructor
 **/
L.PtvLayer.Background = L.TileLayer.extend({

  _client: null,

  /**
   Default options used in this class.
   @property options
   @type Object
   **/
  options: {
    /**
     The image format used in tile requests.
     @property options.format
     @type String
     @default "PNG"
     **/
    format: 'PNG',
	
	/**
     Function to be called before sending the request with the request object given as first parameter. The (modified) request object must be returned.
     @property options.beforeSend
     @type function
     @default null
     **/
    beforeSend: null,

    /**
     The image to display when requests fail.
     @property options.errorTileUrl
     @type String
     @default "tile-error.png"
     **/
    errorTileUrl: 'tile-error.png',

    /**
     If set to true, the tiles just won't load outside the world width (-180 to 180 longitude) instead of repeating.
     @property options.noWrap
     @type boolean
     @default true
     **/
    noWrap: true,

    /**
     The world bounds for PTV Maps.
     @property options.bounds
     @type L.LatLngBounds
     @default [[85.0, -178.965000], [-66.5, 178.965000]]
     **/
    bounds: new L.LatLngBounds([[85.0, -178.965000], [-66.5, 178.965000]]),

    /**
     Minimum zoom number.
     @property options.minZoom
     @type boolean
     @default true
     **/
    minZoom: 2,
    
    /**
     Profile for background layer
     @property options.backgroundProfile
     @type String
     @default ajax-bg
     **/
    backgroundProfile: "ajax-bg",
    
    /**
     Reference time for rendering of time dependent feature layers
     @property options.referenceTime
     @type String
     @default "" 
     **/
    referenceTime: "",

    /**
     Profile snippet handed over to xMap request
     @property options.profileSnippet
     @type String
     @default ""
     **/
     profileSnippet: ""
  },

  /**
   Constructor
   @method L.PtvLayer.Background
   @param {XMapClient} client optional XMapClient object
   @param {Object} options optional options object
   **/
  initialize: function(client, options) {
    this._client = client;
    if (typeof client !== 'object' ) {
      if (typeof XMapClient !== 'function') {
        throw Error('The XMapClient object is not accessible globally. Have you loaded "xmap-client.js" properly?');
      } else {
        this._client = new XMapClient(null, 5);
      }
	}
    L.Util.setOptions(this, options);
  },

  onAdd: function(map) {
    L.TileLayer.prototype.onAdd.call(this, map);
    if ( typeof this._client.cancelPendingRequests === 'function') {
      map.on('zoomstart', this._client.cancelPendingRequests);
    }
  },

  onRemove: function(map) {
    L.TileLayer.prototype.onAdd.call(this, map);
    if ( typeof this._client.cancelPendingRequests === 'function') {
      map.off('zoomstart', this._client.cancelPendingRequests);
    }
  },

  /**
   Loads a specific tile and shows the result when finished.
   @method _loadTile
   @private
   @param {DOMElement} tile The tile dom img element
   @param {Point} tilePoint The tile point
   **/
  _loadTile: function(tile, tilePoint) {
    tile._layer = this;
    tile.onload = this._tileOnLoad;
    tile.onerror = this._tileOnError;

    var tileUrl = this._requestTile(tile, tilePoint);
  },

  /**
   Requests a specific tile from the server.
   @method _requestTile
   @private
   @param {DOMElement} tile The tile dom img element
   @param {Point} tilePoint The tile point
   **/
  _requestTile: function(tile, tilePoint) {
    var self = this, map = this._map, crs = map.options.crs, tileSize = this.options.tileSize, zoom = this._map.getZoom(), nwPoint = tilePoint.multiplyBy(tileSize), sePoint = nwPoint.add(new L.Point(tileSize, tileSize)), nw = crs.project(map.unproject(nwPoint, zoom)), se = crs.project(map.unproject(sePoint, zoom)), bbox = new L.LatLngBounds([se.y, nw.x], [nw.y, se.x]);

    var mapSection = {
      leftTop: {
        "$type": "Point",
        point: {
          "$type": "PlainPoint",
          x: bbox.getNorthWest().lng,
          y: bbox.getNorthWest().lat
        }
      },
      rightBottom: {
        "$type": "Point",
        point: {
          "$type": "PlainPoint",
          x: bbox.getSouthEast().lng,
          y: bbox.getSouthEast().lat
        }
      }
    };
	
    var mapParams = {
      showScale: false,
      useMiles: false,
      referenceTime: this.options.referenceTime
    };
	
    var imageInfo = {
      format: this.options.format,
      width: tileSize,
      height: tileSize
    };
	
	var layers = [];
	var includeImageInResponse = true;
	
    var callerContext = {
      properties: [{
        key: "Profile",
        value: this.options.backgroundProfile ? this.options.backgroundProfile : "ajax-bg"
      }, {
        key: "CoordFormat",
        value: "PTV_MERCATOR"
      }]
    };
    
    if (this.options.profileSnippet !== "") {
      callerContext.properties.push({
        key: "ProfileXMLSnippet", 
        value: this.options.profileSnippet
      });
    }
	
	if (typeof this.options.beforeSend === "function") {
		var req = this.options.beforeSend({ mapSection: mapSection, mapParams: mapParams, imageInfo: imageInfo, layers: layers, includeImageInResponse: includeImageInResponse, callerContext: callerContext });
		mapSection = req.mapSection;
		mapParams = req.mapParams;
		imageInfo = req.imageInfo;
		layers = req.layers;
		includeImageInResponse = req.includeImageInResponse;
		callerContext = req.callerContext;
	}

    var cb = (function(tile) {
      return function(resp, error) {
        if (!error && resp) {
          tile.src = L.PtvUtils.createDataURI(resp.image.rawImage);
        } else {
          tile.src = self.options.errorTileUrl;
          console.log(error.errorMessage);
        }
      };
    })(tile);

    this._client.renderMapBoundingBox(mapSection, mapParams, imageInfo, layers, includeImageInResponse, callerContext, cb);
  }
});

L.PtvLayer.background = function(client, options) {
  return new L.PtvLayer.Background(client, options);
};

L.latLngOrig = L.latLng;
L.latLng = function(a, b) {// (Point) or (LatLng) or ([Number, Number]) or (Number, Number)
  if ( typeof a === 'object' && 'x' in a && 'y' in a) {
    return new L.LatLng(a.y, a.x);
  }
  return L.latLngOrig(a, b);
};

L.LatLngBounds.prototype.clip = function(bounds) {// (LatLngBounds)
  bounds = L.latLngBounds(bounds);

  this._southWest.lat = Math.max(bounds.getSouthWest().lat, this._southWest.lat);
  this._southWest.lng = Math.max(bounds.getSouthWest().lng, this._southWest.lng);

  this._northEast.lat = Math.min(bounds.getNorthEast().lat, this._northEast.lat);
  this._northEast.lng = Math.min(bounds.getNorthEast().lng, this._northEast.lng);
};

/**
 @module L.PtvLayer
 **/
L.PtvLayer = L.PtvLayer || {};

/**
 Provides the PTV Foreground Layer class.
 @class L.PtvLayer.Foreground
 @extends L.PtvLayer.AbstractLayer
 @params {XMapClient} client XMapClient object
 @params {Object} options The options object
 @params {String} [options.format] The image format used in tile requests.
 @params {String} [options.beforeSend] Function to be called before sending the request with the request object given as first parameter. The (modified) request object must be returned.
 @constructor
 **/
L.PtvLayer.Foreground = L.PtvLayer.AbstractOverlay.extend({
  initialize: function(client, options) {
    L.PtvLayer.AbstractOverlay.prototype.initialize.call(this, client, options);
  },

  _getRequestObject: function() {
    var req = L.PtvLayer.AbstractOverlay.prototype._getRequestObject.call(this);

    if(this.options.language) {
      req.mapParams.language = this.options.language;
    }

    if(this.options.referenceTime && this.options.referenceTime !== "") {
      req.mapParams.referenceTime = this.options.referenceTime;
    }

    req.callerContext.properties[0].value = this.options.foregroundProfile ? this.options.foregroundProfile : "ajax-fg";
    req.callerContext.properties[1].value = "PTV_MERCATOR";

    if (this.options.profileSnippet && this.options.profileSnippet !== "") {
      req.callerContext.properties.push({
        key: "ProfileXMLSnippet", 
        value: this.options.profileSnippet
        });
    }

    return req;
  }
});

L.PtvLayer.foreground = function(client, options) {
  return new L.PtvLayer.Foreground(client, options);
};

/**
 @module L.PtvLayer
 **/
L.PtvLayer = L.PtvLayer || {};

/**
 Provides the PTV POI Layer class.
 @class L.PtvLayer.Poi
 @extends L.PtvLayer.AbstractLayer
 @params {XMapClient} client XMapClient object
 @params {Object} options The options object
 @params {String} [options.format] The image format used in tile requests.
 @params {String} [options.beforeSend] Function to be called before sending the request with the request object given as first parameter. The (modified) request object must be returned.
 @constructor
 **/
L.PtvLayer.Poi = L.PtvLayer.AbstractOverlay.extend({
  _layerName: 'default.points-of-interest',
  _profile: '',
  _condition: '',
  _formatterFn: null,
  _poiMarkers: null,

  initialize: function(client, options) {
    L.PtvLayer.AbstractOverlay.prototype.initialize.call(this, client, options);
  },

  onAdd: function(map) {
    L.PtvLayer.AbstractOverlay.prototype.onAdd.call(this, map);
    this._poiMarkers = L.layerGroup().addTo(map);
  },

  onRemove: function(map) {
    L.PtvLayer.AbstractOverlay.prototype.onRemove.call(this, map);
    map.removeLayer(this._poiMarkers);
  },

  _getRequestObject: function() {
    var req = L.PtvLayer.AbstractOverlay.prototype._getRequestObject.call(this);

    req.callerContext.properties[0].value = "ajax-av";
    req.callerContext.properties[1].value = "PTV_MERCATOR";
    req.layers = [{
      $type: "SMOLayer",
      name: this._getConfig(),
      visible: true,
      objectInfos: "FULLGEOMETRY",
      configuration: ""
    }];

    return req;
  },

  _renderMapCallback: function(resp, error, el) {
    this._poiMarkers.clearLayers();

    L.PtvLayer.AbstractOverlay.prototype._renderMapCallback.call(this, resp, error, el);

    if (error || resp.objects.length === 0) {
      return;
    }

    var formatter = this.getFormatter(), objects = resp.objects[0].objects, myIcon = L.divIcon({
      className: 'poi-icon',
      iconSize: [20, 20]
    });

    for (var i = 0; i < objects.length; i++) {
      latlng = this._map.containerPointToLatLng([objects[i].pixel.x, objects[i].pixel.y]);
      L.marker(latlng, {
        icon: myIcon
      }).bindPopup(formatter(objects[i].descr)).addTo(this._poiMarkers);
    }
  },

  getFormatter: function() {
    if ( typeof this._formatterFn === 'function') {
      return this._formatterFn;
    } else {
      return function(value) {
        var desc, poiType;

        value = value.split('#')[1];

        if (value.indexOf(':') === -1) {
          desc = value;
        } else {
          var values = value.split(':');
          desc = values[1];
          poiType = values[0];
        }

        return '<p>' + '<strong>' + desc.replace('$§$', '<br/>') + '</strong><br />' + ( poiType ? 'POI Type: ' + poiType : '') + '</p>';
      };
    }
  },

  setFormatter: function(fn) {
    if ( typeof fn === 'function') {
      this._formatterFn = fn;
    }
  },

  _getConfig: function() {
    return this._layerName + (this._profile ? '.' + this._profile : '') + ';' + this._condition;
  },

  setLayerName: function(layerName) {
    this._layerName = layerName;
    this._update();
  },

  getLayerName: function() {
    return this._layerName;
  },

  setProfile: function(profile) {
    this._profile = profile;
    this._update();
  },

  getProfile: function() {
    return this._profile;
  },

  setCondition: function(condition) {
    this._condition = condition;
    this._update();
  },

  getCondition: function() {
    return this._condition;
  }
});

L.PtvLayer.poi = function(client, options) {
  return new L.PtvLayer.Poi(client, options);
};

/**
 @module L.CRS
 **/

/**
 Provides the PTV Mercator coordinate reference system.
 @class L.CRS.PTVMercator
 @constructor
 **/
L.CRS.PTVMercator = L.extend({}, L.CRS, {
  /**
   Standard code name of the CRS passed into WMS services.
   @property code
   @type String
   @default "PTV:MERCATOR"
   @readOnly
   **/
  code: 'PTV:MERCATOR',

  /**
   Projection that this CRS uses.
   @property projection
   @type L.IProjection
   @readOnly
   **/
  projection: L.Projection.SphericalMercator,

  /**
   Transformation that this CRS uses to turn projected coordinates into screen coordinates for a particular tile service.
   @property transformation
   @type L.Transformation
   @readOnly
   **/
  transformation: new L.Transformation(0.5 / Math.PI, 0.5, -0.5 / Math.PI, 0.5),

  /**
   The earth radius used for projections.
   @property earthRadius
   @type Number
   @default 6371000
   @private
   **/
  _earthRadius: 6371000,

  /**
   Projects a geographical coordinate into a PTV Mercator point.
   @method project
   @return {Point} PTV Mercator point.
   **/
  project: function(latlng) {
    var projectedPoint = this.projection.project(latlng);
    return projectedPoint.multiplyBy(this._earthRadius);
  },

  /**
   Unprojects a PTV Mercator point to a geographical coordinate.
   @method unproject
   @return {L.LatLng} Geographical coordinate.
   **/
  unproject: function(point) {
    point = new L.Point(point.x, point.y).divideBy(this._earthRadius);
    return this.projection.unproject(point);
  }
});

/**
 @module L
 **/

/**
 @class L.PtvUtils
 @static
 **/
L.PtvUtils = L.PtvUtils || {};

/**
 Prefix map for data URIs.
 @attribute L.PtvUtils._prefixMap
 @type Object
 @private
 **/
L.PtvUtils._prefixMap = {
  "iVBOR": "data:image/png;base64,",
  "R0lGO": "data:image/gif;base64,",
  "/9j/4": "data:image/jpeg;base64,",
  "Qk02U": "data:image/bmp;base64,"
};

/**
 Returns the raw image with prefixed data URI.
 @method L.PtvUtils.createDataURI
 @return {String} the raw image with prefixed data URI.
 **/
L.PtvUtils.createDataURI = function(rawImage) {
  return this._prefixMap[rawImage.substr(0, 5)] + rawImage;
};
