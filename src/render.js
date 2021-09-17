var { desktopCapturer } = require('electron');
var { writeFile } = require('fs');

var azure = require('azure-storage');
var stream = require('stream');

var mediaRecorder;
var saveInLocalFileSystem = true;
var saveInRemoteFileSystem = true;
var recordingDurationInMilliseconds = 500;

var azureStorageName = "demonikolastorage";
var azureContainerName = "democontainer";
// ping me for azure storage key
var azureKey = "";

var fileService = azure.createBlobService(azureStorageName, azureKey, '');
var recordedChunks = [];


var startBtn = document.getElementById('startBtn');
startBtn.onclick = function () {

  desktopCapturer.getSources({ types: ['screen'] }).then(function (inputSources) {
    var captureOptions = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: inputSources[0].id
        }
      }
    };

    navigator.mediaDevices.getUserMedia(captureOptions).then(function (stream) {
      // Create the Media Recorder
      var options = { mimeType: 'video/webm; codecs=vp9' };
      mediaRecorder = new MediaRecorder(stream, options);

      // Register Event Handlers
      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.onstop = handleStop;

      mediaRecorder.start();
      startBtn.classList.add('is-danger');
      startBtn.innerText = 'Recording';


      setTimeout(function () {
        mediaRecorder.stop();
        startBtn.classList.remove('is-danger');
        startBtn.innerText = 'Start command';
      }, recordingDurationInMilliseconds);
    });
  });

};


// Captures all recorded chunks
function handleDataAvailable(e) {
  console.log('video data available');
  recordedChunks.push(e.data);
}

// Saves the video file on stop
function handleStop() {
  var blob = new Blob(recordedChunks, {
    type: 'video/webm; codecs=vp9'
  });

  var fileName = `${Date.now()}.webm`;
  blob.arrayBuffer().then(function (result) {
    var buffer = Buffer.from(result);

    if (saveInLocalFileSystem) {
      saveIntoLocalFileSystem(buffer, fileName);
    }

    if (saveInRemoteFileSystem) {
      saveIntoRemoteFileSystem(buffer, fileName);
    }

  });
}


function saveIntoLocalFileSystem(buffer, fileName) {
  var filePath = process.cwd() + "/" + fileName;

  writeFile(filePath, buffer, function () {
    console.log('Video saved into local filestorage. Path: ' + filePath);
  });
};

function saveIntoRemoteFileSystem(buffer, fileName) {
  var uiProgress = document.getElementById("storage-status");
  uiProgress.innerText = 'Uploading file to Azure storage ...';
  var fileStream = new stream.Readable();
  fileStream.push(buffer);
  fileStream.push(null);


  fileService.createBlockBlobFromStream(azureContainerName, fileName, fileStream, buffer.length, function (error, result, response) {
    if (error) {
      alert('Error occured while uploading file !!');
      uiProgress.innerText = "Error occured while uploading file !!";
    }
    else {
      var uploadedFileUrl = "https://" + azureStorageName + ".blob.core.windows.net/" + azureContainerName + "/" + fileName;
      uiProgress.innerText = "Blob URL: " + uploadedFileUrl;
    }
  });
}
