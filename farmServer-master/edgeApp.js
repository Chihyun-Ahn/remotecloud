var request = require('request');
// const edgeAddress = 'http://www.naver.com';
const edgeAddress = 'http://223.194.33.91:5000/cloudRequest.do';

setInterval(()=>{
    console.log('엣지웹서버에 데이터 요청 보냅니다.');
    request.post(edgeAddress,{
        json: {
            todo: 'buy the milk'
        }
    },(error, res, body)=>{
        if(error){
            console.error(error);
            return;
        }
        console.log(`statusCode: ${res.statusCode}`);
        console.log(body);
    });
},3000);