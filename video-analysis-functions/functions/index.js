// functions/index.js
const path = require('path');
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'service-account-key.json');

const functions = require('firebase-functions');
const {VideoIntelligenceServiceClient} = require('@google-cloud/video-intelligence');
// const {Storage} = require('@google-cloud/storage');

exports.analyzeVideo = functions.https.onRequest(async (req, res) => {
    // CORSヘッダー設定
    // console.log(req);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    res.set('cors', 
      [
        // 本番環境用
        'https://transformnavi.sakura.ne.jp/',
        // 'https://sendslackmessage-thvvclx4xa-an.a.run.app',
        // 開発環境用
        'http://127.0.0.1:5500',
        'http://localhost:5500'
    ] 
    );

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const {videoUrl} = req.body;
        if (!videoUrl) {
            throw new Error('Video URL is required');
        }

        const client = new VideoIntelligenceServiceClient();

        const request = {
            inputUri: videoUrl,
            features: ['FACE_DETECTION'],
            locationId: 'asia-east1',
            videoContext: {
                segments: [{
                    startTimeOffset: {seconds: '0'},
                    endTimeOffset: {seconds: '10'}
                }]
            }
        };


        
        console.log('API Request:', JSON.stringify(request, null, 2));
        const [operation] = await client.annotateVideo(request);
        console.log('Operation started: ', operation.name);



        const result = await operation.promise();
        console.log('Analysis complete');
        console.log(result);

        // 結果の整形
        const faceAnnotations = result[0].annotationResults[0].faceAnnotations;
        console.log('Face Annotations:', JSON.stringify(faceAnnotations, null, 2));

        res.json({
          status: 'success',
          done: true,
          result: {
              faceAnnotations: faceAnnotations
          }
      });
        
        // res.json({
        //     status: 'processing',
        //     operationName: operation.name
        // });

    } catch (error) {
        console.error('Error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          stack: error.stack
        });
        
        res.status(500).json({
            status: 'error',
            code: error.code,
            message: error.message,
            details: error.details
        });
    }
});

exports.analyzeVideoStatus = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
  }

  try {
      const {operationName} = req.body;
      if (!operationName) {
          throw new Error('Operation name is required');
      }

      const client = new VideoIntelligenceServiceClient();
      const operation = await client.checkOperation(operationName);

      if (operation.done) {
          const result = operation.result;
          const faceAnnotations = result.annotationResults[0].faceAnnotations;
          
          res.json({
              status: 'success',
              done: true,
              result: {
                  faceAnnotations: faceAnnotations
              }
          });
      } else {
          res.json({
              status: 'processing',
              done: false
          });
      }

  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
          status: 'error',
          message: error.message
      });
  }
});