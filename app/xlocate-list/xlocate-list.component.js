angular.
  module('xlocateList').
  component('xlocateList', {
    templateUrl: 'xlocate-list/xlocate-list.template.html',

    controller: ['Xlocate', 'RequestService', 'XlocateService', 'RenderMap', 'UpdateMap', 'NgTableParams',
		function XlocateListConstroller( Xlocate, RequestService, XlocateService, RenderMap, UpdateMap, NgTableParams){
			var self = this; 	
			self.locations = [];
			self.orderProp = "city";
			
			self.tableParams = new NgTableParams({}, { dataset: self.locations });
			var layer;
			self.map = RenderMap.getMap(49.008083301,  8.4037561426);
			self.tileLayer = RenderMap.getTileLayer().addTo(self.map);
			//xServer 1.20 request
			self.setAddress = function setAddress(){
					getData = Xlocate.save(function(response){
					
					self.addresses = response.data.resultList;
					console.log(response.data.resultList);
				});
			};
			
			//xLocate 2.0 request
			self.sendRequest = function(){
				var request =   { 
					  "searchObject": {
						"$type": "AddressLine",
						"text": self.inputcity
						  }
					  };

			var myObj = XlocateService.sendRequest(request).then(function(response){
					
					var obj = response.data.results;
					
					for(var i=0; i<obj.length; i++){
						var location = obj[i].location;
						self.locations[i] = location;
					}
					
					console.log(self.locations);
					
					//Map stuff
					var pois = [];
					var coords = [];
					var x;
					var y;
					self.tileLayer = RenderMap.getTileLayer().addTo(self.map);
					if(layer != null){
						self.map.removeLayer(layer);
					}
					
					for(var i=0; i<response.data.results.length; i++){
						if(i==0){
							x = response.data.results[i].location.referenceCoordinate.x;
							y = response.data.results[i].location.referenceCoordinate.y;
						}
						pois.push({
							"type": "Feature",
							"properties":{
								"name" : response.data.results[i].location.address.formattedAddress,
							},
							"geometry":{
								"type": "Point",
								"coordinates": [response.data.results[i].location.referenceCoordinate.x, response.data.results[i].location.referenceCoordinate.y]
							},

						});
						
						 coords.push([
							response.data.results[i].location.referenceCoordinate.y,
							response.data.results[i].location.referenceCoordinate.x
						]);						
					}

						UpdateMap.updateMap(response.data.results, self.tileLayer);
						layer = new L.GeoJSON(pois).addTo(self.map);
						self.map.fitBounds(coords);
						
				});			
			}
			self.setSelected = function(location){
			self.map.setZoom(15);
			self.map.panTo([location.referenceCoordinate.y, location.referenceCoordinate.x]);
			
		};			
	}
		
	]
  });
	