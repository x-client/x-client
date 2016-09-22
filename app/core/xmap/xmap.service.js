var localTileLayer;
var myMap;
function RenderMap() {
	this.getMap = function(x, y){
		myMap = new L.Map('mymap', { center: [x,  y], zoom: 13 }); 	
		return myMap;
		
	};
	
  
	  this.getTileLayer = function(){
		var urlTemplate = 'http://xserver-2:50000/services/rest/XMap/tile/{z}/{x}/{y}/gravelpit+PTV_TruckAttributes';
		return new L.TileLayer(urlTemplate, { 
			minZoom: 1, 
			maxZoom: 19, 
			attribution: 'PTV, TomTom' }
		);  
	  };
    }
function UpdateMap(tileLayer){
	
	this.updateMap = function(response, tileLayer){
		localTileLayer = tileLayer;
	};
	
	this.getTileLayer = function(localTileLayer){
		return localTileLayer;
	}
	
	
}	
angular.
  module('core.xmap')
  .service('RenderMap',[RenderMap] )
  .service('UpdateMap',[UpdateMap] );
  