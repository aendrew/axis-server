'use strict';

angular.module('axismakerApp')
  .controller('EditCtrl', function ($scope, $window, $location, Auth, $stateParams) {
    var branch = 'gh-pages'; // change to gh-pages in prod
    $scope.itemName = typeof $stateParams.item !== 'undefined' ? $stateParams.item : undefined;
    var token = Auth.getCurrentUser().githubToken;
    var github = new Github({token: token, auth: 'oauth'});
    var currentRepoURI = Auth.getCurrentUser().repoURI;
    var repoName = currentRepoURI.match(/git:\/\/github\.com\/([^/]+)\/(.+?)\.git$/);
    var repo = github.getRepo(repoName[1], repoName[2]);

    // Item isn't set, let user choose
    if (!$scope.itemName) {
      repo.getTree(branch, function(err, tree){
        // Create a list of directories
        var directories = [];
        angular.forEach(tree, function(item){
          if (item.type === 'tree') {
            directories.push(item);
          }
        });

        // Filter for directories with axis.json
        $scope.directories = [];
        angular.forEach(directories, function(item){
          repo.getSha(branch, item.path + '/axis.json', function(err, sha){
            console.clear(); // hide ugly 404s.
            if (sha) {
              $scope.directories.push(item);
              $scope.$apply();
            }
          });
        });
      });
    } else {
      repo.read(branch, $scope.itemName + '/axis.json', function(err, config){
        if (err) {
          alert('This isn\'t an Axis chart!');
          $location.path = '/edit';
        } else { // Load config object into Axis
          $scope.axisConfig = config;
          $scope.$apply();
        }
      });
    }

    $scope.editChart = function(path) {
      $location.path('/edit/' + path);
    };

    // Update chart
    var createNew = function(config) {
      if ($scope.filename !== '') {
        $http.get('/app/preview/preview.html').success(function(template){
          var timestamp = new Date();
          repo.write($scope.branch, $scope.filename + '/index.html', template, 'Updated ' + timestamp.toISOString() , function(err, res, xmlhttprequest){
            repo.write($scope.branch, $scope.filename + '/axis.json', config.config, 'Updated ' + timestamp.toISOString(), function(err, res, xmlhttprequest){
              // url = 'https://' + repoName[1] + '.github.io/' + repoName[2] + '/' + res.content.path;
              console.dir([err, res, xmlhttprequest]);
              console.log('finished');
            });
          });
        });
      }
    };

    angular.element($window).bind('message', function(e) {
      var config = angular.fromJson(e.originalEvent.data);
      createNew(config);
    });
  });