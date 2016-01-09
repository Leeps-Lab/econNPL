Redwood.controller("SubjectCtrl", ["$rootScope", "$scope", "RedwoodSubject", "SynchronizedStopWatch", function($rootScope, $scope, rs, SynchronizedStopWatch) {

  $scope.messages = [];
  $scope.message = "";
  $scope.count = 0;

  rs.on_load(function() {
		rs.config.pairs.forEach(function(pair, index) { //decide who is the first player and who is the second player
			var userIndex = pair.indexOf(parseInt(rs.user_id));
			if(userIndex > -1) {
				$scope.pair_index = index;
				$scope.user_index = userIndex;
				$scope.partner_id = pair[($scope.user_index + 1) % 2].toString();
			}
		});

		$scope.matrix = $scope.user_index === 0 ? rs.config.matrix : transpose(rs.config.matrix);
    $scope.play = rs.config.messaging;

		$scope.round = 0;
    $scope.chatEnabled = false;

		rs.synchronizationBarrier('on_load').then(function() {
      $scope.periodinseconds = rs.config.periodinseconds ? rs.config.periodinseconds : 20;
      if ($scope.play === "preplay") {
        $scope.timeleft = $scope.periodinseconds;
        $scope.chatEnabled = true;
        $("#decision").addClass("disabled");
        $("#communicate").addClass("enabled");
        SynchronizedStopWatch.instance()
          .duration($scope.periodinseconds)
          .frequency(1).onTick(function() {
            $scope.timeleft = $scope.timeleft - 1;
          })
          .onComplete(function() {
            $("#decision").removeClass("disabled").addClass("enabled");
            $("#communicate").removeClass("enabled").addClass("disabled");
            rs.trigger("next_round");
        }).start();
      } else {
        $("#decision").addClass("enabled");
        $("#communicate").addClass("disabled");
			  rs.trigger("next_round"); //Start first round
      }
		});
	});

	$scope.onSelection = function(selection) {
		if($scope.inputsEnabled) {
			$scope.selection = selection;
		}
	};

	$scope.confirm = function() {
		if(!angular.isNullOrUndefined($scope.selection)) { //Check that user has selected an action
			$scope.inputsEnabled = false;
			rs.trigger("action", $scope.selection);
		} else {
			alert("Please select an action.");
		}
	};

  $scope.sendMessage = function(e) {
    if (e && e.keyCode !== 13) return;
    if ($scope.message === "") return;
    rs.trigger("sendmessage", {
      from: $scope.user_index,
      text: $scope.message
    });
    $scope.message = "";
  };

  // on messages
	rs.on("action", function(value) {
		$scope.inputsEnabled = false;
		$scope.selection = value;
		$scope.action = value;
		rs.synchronizationBarrier('round_' + $scope.round, [$scope.partner_id]).then(function() { //Call this function once the partner subject has reached this point
			allocateRewards($scope.action, $scope.partnerAction);
			rs.trigger("next_round");
		}, [$scope.partner_id]);
	});
  rs.on("sendmessage", function(message) {
    $scope.messages.push(message);
    console.log($scope.count++);
  })

  // recv messages
	rs.recv("action", function(sender, value) {
		if(sender == $scope.partner_id) {
			$scope.partnerAction = value;
		}
	});
  rs.recv("sendmessage", function(sender, message) {
    if (sender == $scope.partner_id) {
      $scope.messages.push(message);
      console.log('recv');
    }
  });

	rs.on("next_round", function() {
    if ($scope.chatEnabled) $scope.chatEnabled = false;
		$scope.round++;
		$scope.rounds = $.isArray(rs.config.rounds) ? rs.config.rounds[$scope.pair_index] : rs.config.rounds;
    if ($scope.play === "allplay") {
      $("#communicate").removeClass("disabled").addClass("enabled");
    }

		$scope.prevAction = $scope.action;
		$scope.prevPartnerAction = $scope.partnerAction;

		if($scope.round > $scope.rounds) {
      if ($scope.play === "postplay") {
        $("#decision").removeClass("enabled").addClass("disabled");
        $("#communicate").removeClass("disabled").addClass("enabled");
        $scope.chatEnabled = true;
        $scope.timeleft = $scope.periodinseconds
        SynchronizedStopWatch.instance()
          .duration($scope.periodinseconds)
          .frequency(1).onTick(function() {
            $scope.timeleft = $scope.timeleft - 1;
          })
          .onComplete(function() {
            rs.next_period(5);
        }).start();
      } else {
        rs.next_period(5);
      }
		} else {
			$scope.inputsEnabled = true;
		}
	});

	var allocateRewards = function(ai, aj){
		$scope.reward = $scope.matrix[ai - 1][aj - 1][0];
		rs.add_points($scope.reward);

		$scope.partnerReward = $scope.matrix[ai - 1][aj - 1][1];
	};

	var transpose = function(matrix) { //transpose a 2x2 matrix
		var transposed = [[[], []], [[], []]];
		for(var i = 0; i < 4; i++){
			var row = Math.floor(i/2);
			var column = i % 2;
			transposed[column][row] = [matrix[row][column][1], matrix[row][column][0]];
		}
		return transposed;
	};

}]);

Redwood.filter("action", function() {
	var actions = {
		1: "A",
		2: "B"
	};
	return function(value) {
		return	actions[value];
	};
});
