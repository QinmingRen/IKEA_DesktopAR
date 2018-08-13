"use strict"


b4w.register("Marker_Identifier", function (exports, require) {
  var m_TSR = require("tsr");
  var m_util = require("util");

    var cam_deviceId;
    var ident_cb;
    var video_stream;

    exports.init = function (camera_id, rec_callback) {
        cam_deviceId = camera_id;
        ident_cb = rec_callback;
        initArMarkerTracking();
    }

    exports.dispose = function(){
        video_stream.getTracks()[0].stop();
    }

    function initArMarkerTracking() {
        
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    
      if (navigator.getUserMedia) {
        navigator.getUserMedia({
          'video': {
            deviceId: { exact: cam_deviceId },
          },
          audio: false
        },
          function (stream) { // on success
            video_stream = stream;
            var video = document.getElementById('ar_canvas');
            video.src = window.URL.createObjectURL(stream);
            video.play();

            initArCamera(video, stream);
          },
          function () { // on error
            console.log('Failed to load video.')
          });
      } else {
        console.log('Failed to init WebRTC.')
      }
    }

    function initArCamera(video, stream) {

        var cameraParam = new ARCameraParam();
        cameraParam.src = 'assets/js/camera_para.dat';
        cameraParam.facingMode = 'facing'
        cameraParam.onload = function () {
      
          var arController;
          var interval = setInterval(function () {
      
            if (!video.videoWidth) return;
      
            if (!arController) {
      
              arController = new ARController(video, cameraParam);
              arController.setPatternDetectionMode(artoolkit.AR_MATRIX_CODE_DETECTION);
              //arController.debugSetup();
      
              arController.addEventListener('getMarker', function (event) {
                var foundMarkers = event.data;
                if (foundMarkers.length > 0)
                {
                    var dest = new Float32Array(8);
                    m_TSR.from_mat4(foundMarkers[0].matrix, dest);      
                    var q = new Float32Array(4);
                    q = m_TSR.get_quat_view(dest);
                    var eu = new Float32Array(3);
                    m_util.quat_to_euler(q, eu);      
                    ident_cb(foundMarkers[0].marker.id, eu[2]);
                }
              });
            }
      
            // ar-marker injection point
            // after detection, getMarker event will be called
            arController.process();      
          }, 16); // 16 => 1000 msec /16 = 62.5fps
        };
      }
      
});

var Marker_Identifier = b4w.require("Marker_Identifier");
