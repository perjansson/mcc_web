app.controller('MeetingCostCalculatorCtrl', function($scope, $location, $window, constants, meetingCostService, socketioMeetingService, restMeetingService) {

    /* Properties for handling updating of meeting cost text */
    var updateMeetingTextIntervalDelay = constants.meetingCostTextUpdateIntervalInMillis;
    var updateMeetingTextTimerId = 0;

    /* Properties for handling updating backend */
    var updateBackendIntervalDelay = constants.backendUpdateIntervalInMillis;
    var updateBackendTimerId = 0;

    $scope.version = constants.versionNumber;
    
 	$scope.meeting = {
				    	id: null,
                        name: null,
                        numberOfAttendees: constants.numberOfAttendeesText, 
				    	averageHourlyRate: constants.averageHourlyRateText,
				    	currency: constants.currencyText,
                        status: 'notStarted',
                        isBoring: false,
                        meetingStartTime: null,
                        pauseTimeStamp: null,
                        meetingPauseTime: null,
                        meetingCost: null
				    };
 
    if (constants.shouldPersistMeetings) {
        if (constants.shouldUseNodeJs) {
            connectUsingNodeJs();
        }
    }

    function connectUsingNodeJs() {
        var onConnectCallback = function() {
            $('#connection-indicator').addClass('connected').removeClass('disconnected');
        };
        var onMeetingUpdatedCallback = function(meeting) {
            console.log('On meeting update: ' + JSON.stringify(meeting));
            $scope.meeting.id = meeting.id;
        };
        var onDisconnectCallback = function() {
            $('#connection-indicator').addClass('disconnected').removeClass('connected').removeClass('connecting');
        };
        var onErrorCallback = function() {
            $('#connection-indicator').addClass('disconnected').removeClass('connected').removeClass('connecting');
        };
        socketioMeetingService.subscribe(onConnectCallback, onMeetingUpdatedCallback, onDisconnectCallback, onErrorCallback);
        socketioMeetingService.connect();
    }

    $scope.connect = function() {        
        if (constants.shouldUseNodeJs && $('#connection-indicator').attr('class').split(' ') == 'disconnected') {
            connectUsingNodeJs();
        }
    }

    $scope.startMeeting = function() {
        $scope.meeting.status = 'started';
        $scope.meeting.id = null;
        $scope.meeting.name = null;
        $scope.meeting.meetingStartTime = new Date();
        $scope.meeting.meetingCost = 0;
        $scope.meeting.meetingPauseTime = null;

        clearInterval(updateMeetingTextTimerId);
        clearInterval(updateBackendTimerId);
        updateMeetingTextTimerId = setInterval(meetingCostCalculator, updateMeetingTextIntervalDelay);
        updateBackendTimerId = setInterval(sendMeetingToServer, updateBackendIntervalDelay);

        sendMeetingToServer();
    };

    $scope.stopMeeting = function() {
        $scope.meeting.status = 'stopped';
        $scope.meeting.isBoring = false;

        pauseTimeStamp = new Date();
        clearInterval(updateMeetingTextTimerId);
        clearInterval(updateBackendTimerId);

        sendMeetingToServer();

    };

    $scope.pauseMeeting = function() {
        $scope.meeting.status = 'paused';

        $scope.meeting.pauseTimeStamp = new Date();
        clearInterval(updateMeetingTextTimerId);
        clearInterval(updateBackendTimerId);

        sendMeetingToServer();
    };

    $scope.resumeMeeting = function() {
        $scope.meeting.meetingPauseTime = $scope.meeting.meetingPauseTime + (new Date() - $scope.meeting.pauseTimeStamp);
        $scope.meeting.status = 'started';

        $scope.meeting.pauseTimeStamp = 0;
        updateMeetingTextTimerId = setInterval(meetingCostCalculator, updateMeetingTextIntervalDelay);
        updateBackendTimerId = setInterval(sendMeetingToServer, updateBackendIntervalDelay);

        sendMeetingToServer();
    };

    $scope.shareMeeting = function() {
        var meetingId = $scope.meeting.id;
        if (meetingId != null) {
            $window.open(constants.sharingUrl + meetingId);  
        }
    }

    $scope.addNameToMeeting = function() {
        sendMeetingToServer();
    }

    var meetingCostCalculator = function() {
        $scope.meeting.meetingCost = meetingCostService.getMeetingCost($scope.meeting);
        $scope.$apply();
    }

    function sendMeetingToServer() {
        if (constants.shouldPersistMeetings) {
            if (constants.shouldUseNodeJs) {
                socketioMeetingService.send(JSON.stringify($scope.meeting));
            }
            if (constants.shouldUseSpringMvc) {
                restMeetingService.create($scope.meeting, function success(responseMeeting) {
                    // Update meeting with id from response
                    $scope.meeting.id = responseMeeting.id;
                    console.log(JSON.stringify($scope.meeting));
                });
            }
        }
    }

    $scope.animateToBottom = function() {
        setTimeout(function () {    
            $('html, body').scrollTop($('body').prop("scrollHeight"));
        }, 100);
    }

});