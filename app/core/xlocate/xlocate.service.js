function RequestFactory($resource){  
	 var self = this;	
	function formatRequest(request){
			addr =  {	  "addr": {
								"country": "D",
								"postCode": "",
								"city": "Karlsruhe",
								"city2": "",
								"street": "Hauptstr. 1",
								"houseNumber": ""
							  },
							  "options": [],
							  "sorting": [],
							  "additionalFields": [],
							  "callerContext": {
								"properties": [
								  {
									"key": "CoordFormat",
									"value": "PTV_MERCATOR"
								  },
								  {
									"key": "Profile",
									"value": "default"
								  }
								]
							  }
							};
	return angular.toJson(addr);
	};
	
		var Xlocate = $resource('http://localhost:50020/xlocate/rs/XLocate/findAddress/', {}, {
			save:{
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				params: {},
				isArray: true,
				transformRequest:formatRequest, 
				interceptor: {
				response:function(response){
					self.addresses = response.data.resultList;
					return response;
				}
							}
				}
			});
	return Xlocate;
    }
function SetRequestParameter(){
	  this.set = function(city){
		console.log(city);
	  }
	  this.get = function(){
		  return self.request;
	  }
}

function SetXlocateRequest($http) {
	
	this.sendRequest = function(request, callback){
		return $http({
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			data: request,
			url: "http://xserver-2:40000/services/rs/XLocate/searchLocations/"
		});
	  };
	 
    }
	
angular.
  module('core.xlocate')
  .factory('Xlocate', ['$resource' , RequestFactory ])
  .service('RequestService', SetRequestParameter)
  .service('XlocateService',['$http', SetXlocateRequest] );
  