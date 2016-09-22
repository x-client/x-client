'use strict';

angular.
  module('xClient').
  config(['$locationProvider' ,'$routeProvider',
    function config($locationProvider, $routeProvider) {
      $locationProvider.hashPrefix('!');

      $routeProvider.
		when('/xlocate', {
	      template:'<xlocate-list></xlocate-list>'
		}).
        otherwise('');
    }
  ]);
